import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { groupApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { TRANS_GROUP_STATUS } from '../../utils/format';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const FILTERS = ['', ...Object.keys(TRANS_GROUP_STATUS)];

function AdminGroupsPage() {
	const [status, setStatus] = useState('');
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const { data, error, loading, reload } = useFetch(
		() => groupApi.adminList({ status: status || undefined, size: 50, sortBy: 'createdAt' }),
		[status],
	);

	const handleDelete = async (group) => {
		const ok = await confirm({
			title: `Xác nhận xóa nhóm dịch "${group.name}"?`,
			message: 'Hành động này sẽ xóa nhóm dịch khỏi hệ thống. Các bộ truyện của nhóm sẽ không còn thuộc nhóm này.',
			confirmText: 'Xác nhận xóa nhóm',
			tone: 'danger',
		});
		if (!ok) return;

		mutation.run(async () => {
			await groupApi.remove(group.id);
			toast.success(`Đã xóa nhóm dịch "${group.name}".`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xóa nhóm dịch.');
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
						{value ? TRANS_GROUP_STATUS[value] : 'Tất cả'}
					</button>
				))}
			</div>

			{loading ? (
				<Loading />
			) : error ? (
				<ErrorMessage error={error} onRetry={reload} />
			) : data?.content?.length === 0 ? (
				<EmptyState>Không có nhóm dịch nào.</EmptyState>
			) : (
				<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
					{data.content.map((group) => (
						<li key={group.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
							<div>
								<Link
									to={`/groups/${group.slug ?? group.id}`}
									className="text-sm font-semibold text-neutral-100 transition-colors hover:text-white"
								>
									{group.name}
								</Link>
								<span className="block text-xs text-neutral-500 mt-0.5">@{group.slug}</span>
							</div>
							<div className="flex items-center gap-3">
								{status && <Badge>{TRANS_GROUP_STATUS[status]}</Badge>}
								<Button
									variant="danger"
									onClick={() => handleDelete(group)}
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

export default AdminGroupsPage;
