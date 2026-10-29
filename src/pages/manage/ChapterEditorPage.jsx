import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { UploadCloud, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { chapterApi, uploadApi, ApiError } from '../../api';
import { resolveMangaId } from '../../utils/resolveUrl';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function ChapterEditorPage() {
	const { slug } = useParams();
	const navigate = useNavigate();
	const confirm = useConfirm();
	const toast = useToast();

	const [chapterIndex, setChapterIndex] = useState('');
	const [title, setTitle] = useState('');
	// Mỗi trang: { id, name, size, preview, progress, url, status }
	const [pages, setPages] = useState([]);
	const [uploadError, setUploadError] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [dragOverZone, setDragOverZone] = useState(false);
	const [dragItemIndex, setDragItemIndex] = useState(null);

	const fileInputRef = useRef(null);
	const nextId = useRef(1);
	const pagesRef = useRef([]);
	const mutation = useMutation();

	useEffect(() => {
		pagesRef.current = pages;
	}, [pages]);

	useEffect(
		() => () => {
			pagesRef.current.forEach((page) => {
				if (page.preview) URL.revokeObjectURL(page.preview);
			});
		},
		[],
	);

	const uploaded = pages.filter((page) => page.status === 'done');
	const ready = pages.length > 0 && !uploading && uploaded.length === pages.length;

	const handleFiles = async (fileList) => {
		const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'));
		if (files.length === 0) return;

		if (pages.length + files.length > 150) {
			toast.warning('Một chương chỉ được tải lên tối đa 150 trang.');
			return;
		}

		const items = files.map((file) => ({
			id: nextId.current++,
			name: file.name,
			size: file.size,
			preview: URL.createObjectURL(file),
			progress: 0,
			url: null,
			status: 'uploading',
		}));

		const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
		setPages((prev) => [...prev, ...items]);
		setUploadError(null);
		setUploading(true);

		try {
			const urls = await uploadApi.uploadMulti(files, (event) => {
				if (!totalBytes) return;
				const sent = event.total ? (event.loaded / event.total) * totalBytes : event.loaded;
				const progressById = new Map();
				let offset = 0;
				items.forEach((item) => {
					progressById.set(item.id, Math.min(1, Math.max(0, (sent - offset) / (item.size || 1))));
					offset += item.size;
				});
				setPages((prev) =>
					prev.map((page) =>
						progressById.has(page.id) ? { ...page, progress: progressById.get(page.id) } : page,
					),
				);
			});

			const urlById = new Map(items.map((item, i) => [item.id, urls[i]]));
			setPages((prev) =>
				prev.map((page) =>
					urlById.has(page.id)
						? { ...page, url: urlById.get(page.id), status: 'done', progress: 1 }
						: page,
				),
			);
			toast.success(`Đã tải lên thành công ${files.length} ảnh trang truyện!`);
		} catch (err) {
			const failedIds = new Set(items.map((item) => item.id));
			setPages((prev) =>
				prev.map((page) => (failedIds.has(page.id) ? { ...page, status: 'error' } : page)),
			);
			setUploadError(err);
			toast.error(err.message || 'Lỗi khi tải ảnh lên máy chủ');
		} finally {
			setUploading(false);
		}
	};

	const onPickFiles = (e) => {
		handleFiles(e.target.files);
		e.target.value = '';
	};

	const onDropFiles = (e) => {
		e.preventDefault();
		setDragOverZone(false);
		if (e.dataTransfer?.files) {
			handleFiles(e.dataTransfer.files);
		}
	};

	const removePage = (id) => {
		const target = pages.find((page) => page.id === id);
		if (target?.preview) URL.revokeObjectURL(target.preview);
		setPages((prev) => prev.filter((page) => page.id !== id));
		setUploadError(null);
	};

	const clearAllPages = async () => {
		const ok = await confirm({
			title: 'Xóa toàn bộ ảnh đã chọn?',
			message: 'Bạn có chắc chắn muốn bỏ tất cả các trang ảnh đã chọn không?',
			confirmText: 'Xóa tất cả',
			tone: 'danger',
		});
		if (!ok) return;

		pages.forEach((page) => {
			if (page.preview) URL.revokeObjectURL(page.preview);
		});
		setPages([]);
		setUploadError(null);
		toast.info('Đã xóa danh sách ảnh.');
	};

	const movePage = (from, to) => {
		if (from === to || to < 0 || to >= pages.length) return;
		setPages((prev) => {
			const next = [...prev];
			const [item] = next.splice(from, 1);
			next.splice(to, 0, item);
			return next;
		});
	};

	const submit = async (e) => {
		e.preventDefault();
		if (!chapterIndex) {
			toast.warning('Vui lòng nhập số thứ tự chương.');
			return;
		}
		if (uploaded.length === 0) {
			toast.warning('Vui lòng tải lên ít nhất một trang truyện.');
			return;
		}

		const ok = await confirm({
			title: `Xác nhận tạo Chương ${chapterIndex}?`,
			message: `Hệ thống sẽ lưu Chương ${chapterIndex}${title ? ` (${title})` : ''} với ${uploaded.length} trang truyện.`,
			confirmText: 'Tạo chương ngay',
			tone: 'primary',
		});

		if (!ok) return;

		mutation.run(async () => {
			const mangaId = await resolveMangaId(slug);
			if (!mangaId) throw new ApiError('404', 'Không tìm thấy truyện.');
			await chapterApi.create(mangaId, {
				chapterIndex: Number(chapterIndex),
				title,
				pageUrls: uploaded.map((page) => page.url),
			});
			toast.success(`Đã tạo thành công Chương ${chapterIndex}!`);
			navigate(`/manage/mangas/${slug}/chapters`);
		}).catch((err) => {
			toast.error(err.message || 'Không thể tạo chương.');
		});
	};

	return (
		<section className="animate-fade-up max-w-4xl mx-auto pb-12">
			<div className="mb-6 flex items-center justify-between">
				<PageHeader
					title="Thêm chương mới"
					subtitle="Tải lên và xem trước các trang truyện một cách trực quan"
				/>
				<Link to={`/manage/mangas/${slug}/chapters`}>
					<Button variant="ghost" className="flex items-center gap-1.5 text-xs sm:text-sm">
						<ArrowLeft className="h-4 w-4" />
						Quản lý chương
					</Button>
				</Link>
			</div>

			<form onSubmit={submit} className="space-y-6 rounded-3xl border border-white/10 bg-ink-900 p-6 sm:p-8 shadow-2xl">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Input
						label="Số thứ tự chương (*)"
						type="number"
						min="1"
						step="any"
						placeholder="Ví dụ: 1, 2, 2.5..."
						value={chapterIndex}
						onChange={(e) => setChapterIndex(e.target.value)}
						required
					/>
					<Input
						label="Tiêu đề chương (tuỳ chọn)"
						placeholder="Ví dụ: Cuộc hội ngộ bất ngờ..."
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
				</div>

				{/* Khu vực Drag & Drop tải ảnh - thuần Việt 100% */}
				<div>
					<label className="mb-2 block text-sm font-semibold text-neutral-200">
						Tải lên các trang truyện (Tối đa 150 trang)
					</label>
					<div
						onDragOver={(e) => {
							e.preventDefault();
							setDragOverZone(true);
						}}
						onDragLeave={() => setDragOverZone(false)}
						onDrop={onDropFiles}
						onClick={() => fileInputRef.current?.click()}
						className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
							dragOverZone
								? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
								: 'border-white/20 bg-ink-950/60 hover:border-white/40 hover:bg-white/5'
						}`}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							multiple
							className="hidden"
							onChange={onPickFiles}
						/>
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white mb-3">
							<UploadCloud className="h-8 w-8 text-emerald-400" />
						</div>
						<p className="text-base font-semibold text-white">
							Kéo thả các trang truyện vào đây hoặc nhấn để chọn ảnh
						</p>
						<p className="mt-1 text-xs text-neutral-400">
							Hỗ trợ ảnh định dạng JPG, JPEG, PNG, WEBP (tối đa 10MB / ảnh). Bạn có thể chọn nhiều ảnh cùng lúc.
						</p>
						<button
							type="button"
							className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-ink-950 shadow-md hover:bg-neutral-200 transition-colors"
						>
							<ImageIcon className="h-4 w-4" />
							Chọn ảnh từ máy tính
						</button>
					</div>
				</div>

				{/* Thanh thống kê & Review danh sách ảnh */}
				{pages.length > 0 && (
					<div className="space-y-4 rounded-2xl border border-white/10 bg-ink-950/70 p-4 sm:p-5">
						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
							<div>
								<h3 className="text-sm font-bold text-white flex items-center gap-2">
									<span>Xem trước danh sách trang</span>
									<span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
										{uploaded.length} / {pages.length} trang sẵn sàng
									</span>
								</h3>
								<p className="text-xs text-neutral-400 mt-0.5">
									{uploading ? 'Đang tải ảnh lên máy chủ...' : 'Kéo thả thẻ hoặc dùng mũi tên để đổi thứ tự trang.'}
								</p>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
								>
									+ Thêm ảnh
								</button>
								<button
									type="button"
									onClick={clearAllPages}
									className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
								>
									<Trash2 className="h-3.5 w-3.5" />
									Xóa tất cả
								</button>
							</div>
						</div>

						{/* Lưới thumbnail ảnh trực quan */}
						<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[36rem] overflow-y-auto p-1">
							{pages.map((page, index) => {
								const percent = Math.round((page.progress ?? 0) * 100);
								const isDone = page.status === 'done';
								const isErr = page.status === 'error';

								return (
									<li
										key={page.id}
										draggable
										onDragStart={(e) => {
											e.dataTransfer.effectAllowed = 'move';
											e.dataTransfer.setData('text/plain', String(index));
											setDragItemIndex(index);
										}}
										onDragOver={(e) => e.preventDefault()}
										onDrop={() => {
											if (dragItemIndex != null) movePage(dragItemIndex, index);
											setDragItemIndex(null);
										}}
										onDragEnd={() => setDragItemIndex(null)}
										className={`group relative flex flex-col overflow-hidden rounded-xl border bg-ink-900 transition-all duration-200 cursor-grab ${
											dragItemIndex === index
												? 'border-emerald-400 opacity-40 scale-95'
												: isDone
													? 'border-white/10 hover:border-white/30'
													: isErr
														? 'border-rose-500/50'
														: 'border-amber-500/40'
										}`}
									>
										<div className="relative aspect-[3/4] w-full overflow-hidden bg-ink-950">
											<img
												src={page.preview}
												alt={`Trang ${index + 1}`}
												className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>

											{/* Badge số thứ tự trang */}
											<span className="absolute left-2 top-2 rounded-lg bg-black/80 px-2 py-0.5 text-xs font-black text-white shadow backdrop-blur">
												Trang {index + 1}
											</span>

											{/* Nút xóa ảnh */}
											<button
												type="button"
												onClick={() => removePage(page.id)}
												title="Xóa trang này"
												className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/80 text-neutral-300 shadow backdrop-blur transition-colors hover:bg-rose-500 hover:text-white"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>

											{/* Trạng thái tải */}
											<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2">
												{isDone ? (
													<span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
														<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
														Đã tải xong
													</span>
												) : isErr ? (
													<span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
														<AlertCircle className="h-3.5 w-3.5" />
														Tải lỗi
													</span>
												) : (
													<span className="text-[11px] font-semibold text-amber-300">
														Đang tải {percent}%
													</span>
												)}
											</div>
										</div>

										{/* Nút di chuyển vị trí nhanh */}
										<div className="flex items-center justify-between border-t border-white/10 bg-ink-950 px-2 py-1 text-xs">
											<button
												type="button"
												disabled={index === 0}
												onClick={() => movePage(index, index - 1)}
												className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
												title="Chuyển lên trước"
											>
												<ArrowUp className="h-3.5 w-3.5" />
											</button>
											<span className="text-[10px] text-neutral-500">#{index + 1}</span>
											<button
												type="button"
												disabled={index === pages.length - 1}
												onClick={() => movePage(index, index + 1)}
												className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
												title="Chuyển xuống sau"
											>
												<ArrowDown className="h-3.5 w-3.5" />
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				)}

				{uploadError && (
					<div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
						Lỗi tải ảnh: {uploadError.message}
					</div>
				)}

				<div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
					<Link to={`/manage/mangas/${slug}/chapters`}>
						<Button variant="ghost">Hủy bỏ</Button>
					</Link>
					<Button
						type="submit"
						disabled={mutation.loading || !ready || !chapterIndex}
						className="min-w-[140px] font-bold"
					>
						{mutation.loading ? 'Đang tạo chương...' : 'Xác nhận tạo chương'}
					</Button>
				</div>
			</form>
		</section>
	);
}

export default ChapterEditorPage;
