import { useState } from 'react';
import { userApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';

const STATUS = {
	ACTIVE: { label: 'Hoạt động', tone: 'green' },
	BANNED: { label: 'Đã khoá', tone: 'red' },
	DELETED: { label: 'Đã xoá', tone: 'neutral' },
};

function UsersPage() {
	const [page, setPage] = useState(0);
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const { data, error, loading, reload } = useFetch(
		() => userApi.list({ page, size: 20, sortBy: 'createdAt' }),
		[page],
	);

	const handleBan = async (user) => {
		const ok = await confirm({
			title: `Xác nhận khóa người dùng "${user.displayName || user.username}"?`,
			message: 'Người dùng sẽ bị thu hồi phiên đăng nhập ngay lập tức và không thể tiếp tục truy cập các chức năng của hệ thống.',
			confirmText: 'Khóa tài khoản',
			tone: 'danger',
		});
		if (!ok) return;

		mutation.run(async () => {
			await userApi.ban(user.id);
			toast.success(`Đã khóa tài khoản "${user.displayName || user.username}".`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi khóa người dùng.');
		});
	};

	const handleUnban = async (user) => {
		const ok = await confirm({
			title: `Xác nhận mở khóa cho "${user.displayName || user.username}"?`,
			message: 'Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường.',
			confirmText: 'Mở khóa tài khoản',
			tone: 'primary',
		});
		if (!ok) return;

		mutation.run(async () => {
			await userApi.unban(user.id);
			toast.success(`Đã mở khóa tài khoản "${user.displayName || user.username}".`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi mở khóa người dùng.');
		});
	};

	return (
		<div>
			{loading ? (
				<Loading />
			) : error ? (
				<ErrorMessage error={error} onRetry={reload} />
			) : data?.content?.length === 0 ? (
				<EmptyState>Chưa có người dùng nào.</EmptyState>
			) : (
				<>
					<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
						{data.content.map((user) => (
							<li key={user.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors">
								<span className="flex items-center gap-2 text-sm text-neutral-200">
									<span className="font-semibold text-white">{user.displayName || user.username}</span>
									<span className="text-xs text-neutral-500">@{user.username}</span>
									<Badge tone={STATUS[user.status]?.tone}>
										{STATUS[user.status]?.label ?? user.status}
									</Badge>
								</span>
								<span className="flex gap-2">
									{user.status === 'ACTIVE' && (
										<Button variant="danger" onClick={() => handleBan(user)} className="text-xs">
											Khóa
										</Button>
									)}
									{user.status === 'BANNED' && (
										<Button variant="ghost" onClick={() => handleUnban(user)} className="text-xs">
											Mở khóa
										</Button>
									)}
								</span>
							</li>
						))}
					</ul>
					<Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
				</>
			)}
		</div>
	);
}

export default UsersPage;
