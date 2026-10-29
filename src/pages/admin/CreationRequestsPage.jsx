import { useState } from 'react';
import { creationRequestApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { CREATION_REQUEST_STATUS, CREATION_REQUEST_TONE } from '../../utils/format';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const FILTERS = ['', ...Object.keys(CREATION_REQUEST_STATUS)];

function CreationRequestsPage() {
	const [status, setStatus] = useState('');
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const { data, error, loading, reload } = useFetch(
		() =>
			creationRequestApi.adminList({
				status: status || undefined,
				size: 50,
				sortBy: 'createdAt',
			}),
		[status],
	);

	const handleRequest = async (request, action) => {
		const isApprove = action === 'approve';
		const ok = await confirm({
			title: isApprove ? `Duyệt tạo nhóm "${request.groupName}"?` : `Từ chối tạo nhóm "${request.groupName}"?`,
			message: isApprove
				? `Xác nhận duyệt nhóm dịch "${request.groupName}" do ${request.creatorName || 'thành viên'} tạo? Nhóm sẽ được kích hoạt ngay lập tức.`
				: `Xác nhận từ chối yêu cầu tạo nhóm "${request.groupName}"?`,
			confirmText: isApprove ? 'Duyệt thành lập nhóm' : 'Từ chối yêu cầu',
			tone: isApprove ? 'primary' : 'danger',
		});
		if (!ok) return;

		const run = isApprove ? creationRequestApi.approve : creationRequestApi.reject;
		mutation.run(async () => {
			await run(request.id);
			toast.success(isApprove ? `Đã duyệt thành lập nhóm "${request.groupName}".` : `Đã từ chối tạo nhóm "${request.groupName}".`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xử lý yêu cầu tạo nhóm.');
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
						{value ? CREATION_REQUEST_STATUS[value] : 'Tất cả'}
					</button>
				))}
			</div>

			{loading ? (
				<Loading />
			) : error ? (
				<ErrorMessage error={error} onRetry={reload} />
			) : data?.content?.length === 0 ? (
				<EmptyState>Không có yêu cầu nào.</EmptyState>
			) : (
				<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl">
					{data.content.map((request) => (
						<li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors">
							<div>
								<div className="flex items-center gap-3 text-sm font-semibold text-neutral-100">
									<span>{request.groupName}</span>
									<Badge tone={CREATION_REQUEST_TONE[request.status]}>
										{CREATION_REQUEST_STATUS[request.status]}
									</Badge>
								</div>
								<p className="text-xs text-neutral-400 mt-1">
									{request.creatorName ? `Người yêu cầu: ${request.creatorName}` : ''}
									{request.description ? ` • ${request.description}` : ''}
								</p>
							</div>
							{request.status === 'PENDING' && (
								<div className="flex gap-2">
									<Button onClick={() => handleRequest(request, 'approve')} className="text-xs">
										Duyệt
									</Button>
									<Button variant="ghost" onClick={() => handleRequest(request, 'reject')} className="text-xs">
										Từ chối
									</Button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export default CreationRequestsPage;
