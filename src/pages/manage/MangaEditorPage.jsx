import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categoryApi, mangaApi } from '../../api';
import { resolveMangaId } from '../../utils/resolveUrl';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { MANGA_STATUS } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import ImageUploadField from '../../components/common/ImageUploadField';

const STATUS_OPTIONS = Object.entries(MANGA_STATUS).map(([value, label]) => ({ value, label }));

function MangaEditorPage() {
	const { slug } = useParams();
	const navigate = useNavigate();
	const isEdit = Boolean(slug);
	const confirm = useConfirm();
	const toast = useToast();

	const { data: categories } = useFetch(() => categoryApi.list(), []);
	const resolved = useFetch(
		() => (isEdit ? resolveMangaId(slug) : Promise.resolve(null)),
		[slug],
	);
	const mangaId = resolved.data;
	const { data: manga, loading, error } = useFetch(
		() => (mangaId ? mangaApi.getManagement(mangaId) : Promise.resolve(null)),
		[mangaId],
	);

	const [form, setForm] = useState({
		name: '',
		authorsName: '',
		coverImageUrl: '',
		status: 'ONGOING',
		description: '',
		categoryIds: [],
	});
	const mutation = useMutation();

	useEffect(() => {
		if (!manga) return;
		setForm({
			name: manga.name ?? '',
			authorsName: manga.authorsName ?? '',
			coverImageUrl: manga.coverImageUrl ?? '',
			status: manga.status ?? 'ONGOING',
			description: manga.description ?? '',
			categoryIds: manga.categories?.map((category) => category.id) ?? [],
		});
	}, [manga]);

	if (isEdit && resolved.loading) return <Loading />;
	if (isEdit && resolved.error) return <ErrorMessage error={resolved.error} onRetry={resolved.reload} />;
	if (isEdit && !mangaId) {
		return <ErrorMessage error={{ code: '404', message: 'Không tìm thấy truyện.' }} />;
	}
	if (isEdit && error) return <ErrorMessage error={error} />;
	if (isEdit && (!manga || loading)) return <Loading />;

	const toggleCategory = (id) =>
		setForm((f) => ({
			...f,
			categoryIds: f.categoryIds.includes(id)
				? f.categoryIds.filter((value) => value !== id)
				: [...f.categoryIds, id],
		}));

	const submit = async (e) => {
		e.preventDefault();

		if (!form.name.trim()) {
			toast.warning('Vui lòng nhập tên truyện.');
			return;
		}

		if (isEdit) {
			const originalCategoryIds = manga?.categories?.map((category) => category.id) ?? [];
			const unchanged =
				form.name === (manga?.name ?? '') &&
				form.coverImageUrl === (manga?.coverImageUrl ?? '') &&
				form.status === (manga?.status ?? 'ONGOING') &&
				form.description === (manga?.description ?? '') &&
				form.categoryIds.length === originalCategoryIds.length &&
				form.categoryIds.every((id) => originalCategoryIds.includes(id));
			if (unchanged) {
				toast.info('Không có thay đổi nào cần lưu.');
				return;
			}
		}

		const ok = await confirm({
			title: isEdit ? 'Xác nhận cập nhật truyện?' : 'Xác nhận tạo truyện mới?',
			message: isEdit
				? `Bạn có chắc muốn cập nhật thông tin bộ truyện "${form.name}" không?`
				: `Bạn có chắc muốn tạo mới bộ truyện "${form.name}" không?`,
			confirmText: isEdit ? 'Cập nhật ngay' : 'Tạo truyện',
			tone: 'primary',
		});

		if (!ok) return;

		mutation.run(async () => {
			const payload = {
				name: form.name.trim(),
				status: form.status,
				description: form.description.trim(),
				categoryIds: form.categoryIds,
			};

			if (isEdit) {
				if (form.coverImageUrl && form.coverImageUrl !== (manga?.coverImageUrl ?? '')) {
					payload.coverImageUrl = form.coverImageUrl;
				}
			} else {
				if (form.coverImageUrl) payload.coverImageUrl = form.coverImageUrl;
				if (form.authorsName) payload.authorsName = form.authorsName.trim();
			}

			if (isEdit) {
				await mangaApi.update(mangaId, payload);
				toast.success(`Cập nhật truyện "${form.name}" thành công!`);
			} else {
				await mangaApi.create(payload);
				toast.success(`Đã tạo bộ truyện "${form.name}" thành công!`);
			}
			navigate('/manage');
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi lưu truyện.');
		});
	};

	return (
		<section className="animate-fade-up max-w-4xl mx-auto pb-12">
			<PageHeader
				title={isEdit ? 'Chỉnh sửa truyện' : 'Tạo truyện mới'}
				subtitle={isEdit ? 'Cập nhật các thông tin cơ bản của bộ truyện' : 'Đăng ký truyện mới vào nhóm dịch'}
				actions={
					isEdit && (
						<Link to={`/manage/mangas/${slug}/chapters`}>
							<Button variant="ghost">Quản lý chương truyện</Button>
						</Link>
					)
				}
			/>

			<form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-ink-900 p-6 sm:p-8 shadow-2xl">
				<Input
					label="Tên truyện (*)"
					placeholder="Nhập tên truyện..."
					value={form.name}
					onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
					required
				/>
				{!isEdit && (
					<Input
						label="Tác giả"
						placeholder="Nhập tên tác giả..."
						value={form.authorsName}
						onChange={(e) => setForm((f) => ({ ...f, authorsName: e.target.value }))}
					/>
				)}
				<ImageUploadField
					label="Ảnh bìa truyện (Tỷ lệ 3:4)"
					value={form.coverImageUrl}
					onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
				/>
				<Select
					label="Tình trạng phát hành"
					options={STATUS_OPTIONS}
					value={form.status}
					onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
				/>

				<div>
					<span className="mb-2 block text-sm font-semibold text-neutral-300">Thể loại truyện</span>
					<div className="flex flex-wrap gap-2">
						{categories?.map((category) => {
							const active = form.categoryIds.includes(category.id);
							return (
								<button
									key={category.id}
									type="button"
									onClick={() => toggleCategory(category.id)}
									className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
										active
											? 'border-white/50 bg-white text-ink-950 shadow-md'
											: 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'
									}`}
								>
									{category.name}
								</button>
							);
						})}
					</div>
				</div>

				<Textarea
					label="Mô tả nội dung (Tối đa 500 ký tự)"
					placeholder="Tóm tắt ngắn gọn nội dung bộ truyện..."
					maxLength={500}
					rows={4}
					value={form.description}
					onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
				/>

				<div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
					<Link to="/manage">
						<Button variant="ghost">Hủy bỏ</Button>
					</Link>
					<Button type="submit" disabled={mutation.loading} className="min-w-[130px] font-bold">
						{mutation.loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo truyện ngay'}
					</Button>
				</div>
			</form>
		</section>
	);
}

export default MangaEditorPage;
