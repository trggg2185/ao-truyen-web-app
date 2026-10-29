import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit3, BookOpen } from 'lucide-react';
import { mangaApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useMyGroup } from '../../hooks/useMyGroup';
import { MANGA_STATUS_TONE, mangaStatusLabel, formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

function MyMangaPage() {
	const { data: mine, loading: groupLoading, error: groupError } = useMyGroup();
	const group = mine?.transGroup;
	const isLeader = mine?.status === 'LEADER';
	const groupId = group?.id;
	const confirm = useConfirm();
	const toast = useToast();

	const { data, error, loading, reload } = useFetch(
		() =>
			groupId
				? mangaApi.listByGroup(groupId, { page: 0, size: 100, sortBy: 'createdAt' })
				: Promise.resolve(null),
		[groupId],
	);

	const mutation = useMutation();

	if (groupLoading || loading) return <Loading label="Đang tải danh sách truyện..." />;
	if (groupError) return <ErrorMessage error={groupError} />;
	if (error) return <ErrorMessage error={error} onRetry={reload} />;

	if (!group) {
		return (
			<section className="max-w-4xl mx-auto">
				<PageHeader title="Quản lý truyện" />
				<EmptyState>
					Bạn chưa tham gia nhóm dịch nào. Hãy tạo nhóm hoặc gửi yêu cầu gia nhập tại trang Nhóm dịch.
				</EmptyState>
			</section>
		);
	}

	const handleDelete = async (manga) => {
		const ok = await confirm({
			title: `Xác nhận xóa bộ truyện "${manga.name}"?`,
			message: 'Toàn bộ thông tin, danh sách chương và hình ảnh của bộ truyện sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác!',
			confirmText: 'Xác nhận xóa truyện',
			tone: 'danger',
		});
		if (!ok) return;

		mutation.run(async () => {
			await mangaApi.deleteManga(manga.id);
			toast.success(`Đã xóa bộ truyện "${manga.name}" thành công!`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xóa truyện.');
		});
	};

	return (
		<section className="animate-fade-up max-w-5xl mx-auto pb-12">
			<PageHeader
				title="Quản lý truyện nhóm dịch"
				subtitle={`${group.name} · ${data?.totalElements ?? 0} bộ truyện`}
				actions={
					isLeader && (
						<Link to="/manage/mangas/new">
							<Button className="flex items-center gap-1.5 font-semibold">
								<Plus className="h-4 w-4" />
								Thêm truyện mới
							</Button>
						</Link>
					)
				}
			/>

			{data?.content?.length === 0 ? (
				<EmptyState>Nhóm của bạn chưa đăng bộ truyện nào.</EmptyState>
			) : (
				<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
					{data?.content?.map((manga) => (
						<li key={manga.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors">
							<span className="flex items-center gap-3 text-sm font-semibold text-neutral-100">
								{isLeader ? (
									<Link
										to={`/manage/mangas/${manga.slug ?? manga.id}`}
										className="transition-colors duration-200 hover:text-white"
									>
										{manga.name}
									</Link>
								) : (
									manga.name
								)}
								<Badge tone={MANGA_STATUS_TONE[manga.status]}>{mangaStatusLabel(manga.status)}</Badge>
							</span>
							<span className="flex items-center gap-2">
								<span className="hidden text-xs text-neutral-400 sm:block">
									Ngày tạo: {formatDate(manga.createdAt)}
								</span>
								{isLeader && (
									<Link to={`/manage/mangas/${manga.slug ?? manga.id}`}>
										<Button variant="ghost" className="flex items-center gap-1 text-xs">
											<Edit3 className="h-3.5 w-3.5" />
											Sửa
										</Button>
									</Link>
								)}
								<Link to={`/manage/mangas/${manga.slug ?? manga.id}/chapters`}>
									<Button variant="ghost" className="flex items-center gap-1 text-xs">
										<BookOpen className="h-3.5 w-3.5" />
										Chương
									</Button>
								</Link>
								{isLeader && (
									<Button
										variant="danger"
										onClick={() => handleDelete(manga)}
										disabled={mutation.loading}
										className="flex items-center gap-1 text-xs"
									>
										<Trash2 className="h-3.5 w-3.5" />
										Xoá
									</Button>
								)}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export default MyMangaPage;
