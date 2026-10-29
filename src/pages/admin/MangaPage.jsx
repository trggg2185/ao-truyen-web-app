import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { mangaApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { MANGA_STATUS, MANGA_STATUS_TONE, mangaStatusLabel, formatDate } from '../../utils/format';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const FILTERS = ['', ...Object.keys(MANGA_STATUS)];

function AdminMangaPage() {
	const [status, setStatus] = useState('');
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const { data, error, loading, reload } = useFetch(
		() => mangaApi.adminList({ status: status || undefined, size: 50, sortBy: 'createdAt' }),
		[status],
	);

	const handleDelete = async (manga) => {
		const ok = await confirm({
			title: `Xác nhận xóa bộ truyện "${manga.name}"?`,
			message: 'Toàn bộ dữ liệu của bộ truyện sẽ bị xóa vĩnh viễn khỏi hệ thống.',
			confirmText: 'Xác nhận xóa truyện',
			tone: 'danger',
		});
		if (!ok) return;

		mutation.run(async () => {
			await mangaApi.deleteManga(manga.id);
			toast.success(`Đã xóa bộ truyện "${manga.name}".`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xóa truyện.');
		});
	};

	const chipClass = (active) =>
		`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
			active
				? 'border-white/50 bg-white text-ink-950 shadow-md'
				: 'border-white/10 text-neutral-400 hover:border-white/30 hover:text-white'
		}`;

	return (
		<div>
			<div className="mb-6 flex flex-wrap gap-2">
				{FILTERS.map((value) => (
					<button
						key={value || 'all'}
						type="button"
						className={chipClass(status === value)}
						onClick={() => setStatus(value)}
					>
						{value ? mangaStatusLabel(value) : 'Tất cả'}
					</button>
				))}
			</div>

			{loading ? (
				<Loading />
			) : error ? (
				<ErrorMessage error={error} onRetry={reload} />
			) : data?.content?.length === 0 ? (
				<EmptyState>Không có truyện nào.</EmptyState>
			) : (
				<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
					{data.content.map((manga) => (
						<li key={manga.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors">
							<div>
								<Link
									to={`/mangas/${manga.slug ?? manga.id}`}
									className="text-sm font-semibold text-neutral-100 transition-colors hover:text-white"
								>
									{manga.name}
								</Link>
								<span className="block text-xs text-neutral-500 mt-0.5">
									Ngày tạo: {formatDate(manga.createdAt)}
								</span>
							</div>
							<div className="flex items-center gap-3">
								<Badge tone={MANGA_STATUS_TONE[manga.status]}>{mangaStatusLabel(manga.status)}</Badge>
								<Button
									variant="danger"
									onClick={() => handleDelete(manga)}
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
		</div>
	);
}

export default AdminMangaPage;
