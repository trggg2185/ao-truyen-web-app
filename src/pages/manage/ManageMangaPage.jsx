import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ApiError, chapterApi, mangaApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

function ManageMangaPage() {
	const { slug } = useParams();
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const { data, error, loading, reload } = useFetch(
		async () => {
			const manga = await mangaApi.get(slug);
			if (!manga) throw new ApiError('404', 'Không tìm thấy truyện.');
			const chapters = await chapterApi.listByManga(manga.id, {
				page: 0,
				size: 200,
				sortBy: 'chapterIndex',
			});
			return { mangaId: manga.id, manga, chapters: chapters?.content ?? [] };
		},
		[slug],
	);

	if (loading) return <Loading />;
	if (error) return <ErrorMessage error={error} onRetry={reload} />;

	const { mangaId, manga, chapters } = data ?? {};

	const handleDeleteChapter = async (chapter) => {
		const ok = await confirm({
			title: `Xác nhận xóa Chương ${chapter.chapterIndex}?`,
			message: `Hành động này sẽ xóa vĩnh viễn dữ liệu và hình ảnh của Chương ${chapter.chapterIndex}${chapter.title ? ` (${chapter.title})` : ''}.`,
			confirmText: 'Xác nhận xóa',
			tone: 'danger',
		});
		if (!ok) return;

		mutation.run(async () => {
			await chapterApi.remove(mangaId, chapter.id);
			toast.success(`Đã xóa Chương ${chapter.chapterIndex} thành công!`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xóa chương.');
		});
	};

	return (
		<section className="animate-fade-up max-w-5xl mx-auto pb-12">
			<Link
				to="/manage"
				className="mb-4 inline-flex items-center gap-1.5 text-xs sm:text-sm text-neutral-400 hover:text-white transition-colors"
			>
				<ArrowLeft className="h-4 w-4" />
				Quay lại quản lý truyện
			</Link>

			<PageHeader
				title="Quản lý danh sách chương"
				subtitle={manga?.name}
				actions={
					<Link to={`/manage/mangas/${slug}/chapters/new`}>
						<Button className="flex items-center gap-1.5 font-semibold">
							<Plus className="h-4 w-4" />
							Thêm chương mới
						</Button>
					</Link>
				}
			/>

			{chapters.length === 0 ? (
				<EmptyState>Truyện chưa có chương nào.</EmptyState>
			) : (
				<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
					{chapters.map((chapter) => (
						<li key={chapter.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors">
							<div>
								<span className="text-sm font-semibold text-neutral-100">
									Chương {chapter.chapterIndex}
									{chapter.title ? ` — ${chapter.title}` : ''}
								</span>
								<span className="block sm:hidden text-xs text-neutral-500 mt-0.5">
									{chapter.views} lượt xem · {formatDate(chapter.updatedAt)}
								</span>
							</div>
							<div className="flex items-center gap-4">
								<span className="hidden text-xs text-neutral-400 sm:block">
									{chapter.views} lượt xem · {formatDate(chapter.updatedAt)}
								</span>
								<Button
									variant="danger"
									onClick={() => handleDeleteChapter(chapter)}
									className="flex items-center gap-1 text-xs"
								>
									<Trash2 className="h-3.5 w-3.5" />
									Xoá
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export default ManageMangaPage;
