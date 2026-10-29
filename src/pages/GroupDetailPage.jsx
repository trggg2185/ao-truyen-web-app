import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { groupApi, joinRequestApi, mangaApi } from '../api';
import { useFetch } from '../hooks/useFetch';
import { useMutation } from '../hooks/useMutation';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useMyGroup } from '../hooks/useMyGroup';
import { useAuth } from '../auth/useAuth';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { JOIN_REQUEST_STATUS, JOIN_REQUEST_TONE } from '../utils/format';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Cover from '../components/common/Cover';
import Avatar from '../components/common/Avatar';
import MangaGrid from '../components/manga/MangaGrid';
import EditGroupModal from '../components/group/EditGroupModal';

function GroupDetailPage() {
	const { slug } = useParams();
	const { data: group, error, loading, reload } = useFetch(() => groupApi.get(slug), [slug]);

	if (loading) return <Loading label="Đang tải nhóm..." />;
	if (error) return <ErrorMessage error={error} onRetry={reload} />;
	if (!group) return <ErrorMessage error={{ code: '404', message: 'Không tìm thấy nhóm.' }} />;

	return <GroupDetailContent key={group.id} group={group} reloadGroup={reload} />;
}

function GroupDetailContent({ group, reloadGroup }) {
	const { isAuthenticated } = useAuth();
	const { data: me } = useCurrentUser();
	const { data: mine, reload: reloadMine } = useMyGroup();
	const confirm = useConfirm();
	const toast = useToast();
	const myGroupStatus = mine?.status;
	const [editing, setEditing] = useState(false);
	const [tab, setTab] = useState('mangas');
	const [requestedBy, setRequestedBy] = useState(null);
	const id = group.id;

	// TransGroupResponse không còn translatedMangas; truyện lấy từ endpoint riêng.
	const { data: mangas } = useFetch(
		() => mangaApi.listByGroup(id, { page: 0, size: 100, sortBy: 'createdAt' }),
		[id],
	);
	const mangaList = mangas?.content ?? [];
	const mangaCount = mangas?.totalElements ?? mangaList.length;

	const isLeader = Boolean(me && me.id === group.leader?.id);
	const isMember = Boolean(me && group.members?.some((member) => member.id === me.id));
	const joinRequested = Boolean(me?.id) && requestedBy === me.id;

	const { data: joinRequests, reload: reloadRequests } = useFetch(
		() => (isLeader ? joinRequestApi.listByGroup(id, { status: 'PENDING' }) : Promise.resolve([])),
		[id, isLeader],
	);

	// JoinRequestResponse trả transGroup summary, so khớp chính xác theo id.
	const { data: myPendingJoins } = useFetch(
		() =>
			isAuthenticated && myGroupStatus === 'PENDING_REQUEST'
				? joinRequestApi.listMine({ status: 'PENDING' })
				: Promise.resolve([]),
		[isAuthenticated, myGroupStatus, id],
	);
	const hasPendingJoin = (myPendingJoins ?? []).some(
		(request) => request.transGroup?.id === id,
	);
	const pendingRequest = joinRequested || hasPendingJoin;

	const joinMutation = useMutation();
	const groupMutation = useMutation();
	const requestMutation = useMutation();

	// Leader luôn đứng đầu danh sách thành viên.
	const members = [];
	if (group.leader) members.push(group.leader);
	(group.members ?? []).forEach((member) => {
		if (member.id !== group.leader?.id) members.push(member);
	});

	const handleJoin = async () => {
		const ok = await confirm({
			title: 'Gửi yêu cầu tham gia nhóm?',
			message: `Bạn có muốn gửi yêu cầu gia nhập nhóm "${group.name}" không?`,
			confirmText: 'Gửi yêu cầu',
			tone: 'primary',
		});
		if (!ok) return;

		joinMutation.run(async () => {
			await joinRequestApi.create(id);
			setRequestedBy(me?.id ?? null);
			toast.success('Đã gửi yêu cầu tham gia nhóm thành công!');
			reloadMine();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi gửi yêu cầu tham gia.');
		});
	};

	const handleKick = async (member) => {
		const ok = await confirm({
			title: `Mời thành viên ra khỏi nhóm?`,
			message: `Bạn có chắc muốn mời thành viên "${member.displayName || member.username}" ra khỏi nhóm "${group.name}"?`,
			confirmText: 'Xác nhận mời ra',
			tone: 'danger',
		});
		if (!ok) return;

		groupMutation.run(async () => {
			await groupApi.kickMember(id, member.id);
			toast.success(`Đã mời thành viên "${member.displayName || member.username}" ra khỏi nhóm.`);
			reloadGroup();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi mời thành viên.');
		});
	};

	const handleTransfer = async (member) => {
		const ok = await confirm({
			title: 'Chuyển giao quyền Trưởng nhóm?',
			message: `Bạn có chắc chắn muốn chuyển quyền Leader cho "${member.displayName || member.username}"? Bạn sẽ trở thành thành viên thường.`,
			confirmText: 'Xác nhận chuyển quyền',
			tone: 'danger',
		});
		if (!ok) return;

		groupMutation.run(async () => {
			await groupApi.transferLeader(id, member.id);
			toast.success(`Đã chuyển quyền Trưởng nhóm cho "${member.displayName || member.username}"!`);
			reloadGroup();
			reloadMine();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi chuyển quyền leader.');
		});
	};

	const handleRequest = async (request, action) => {
		const isApprove = action === 'approve';
		const ok = await confirm({
			title: isApprove ? 'Duyệt yêu cầu tham gia?' : 'Từ chối yêu cầu tham gia?',
			message: isApprove
				? `Duyệt người dùng "${request.user?.displayName || request.user?.username}" vào nhóm?`
				: `Từ chối yêu cầu của "${request.user?.displayName || request.user?.username}"?`,
			confirmText: isApprove ? 'Duyệt thành viên' : 'Từ chối',
			tone: isApprove ? 'primary' : 'danger',
		});
		if (!ok) return;

		requestMutation.run(async () => {
			if (isApprove) await joinRequestApi.approve(id, request.id);
			else await joinRequestApi.reject(id, request.id);
			toast.success(isApprove ? 'Đã duyệt yêu cầu thành công!' : 'Đã từ chối yêu cầu.');
			reloadRequests();
			reloadGroup();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xử lý yêu cầu.');
		});
	};

	const tabs = [
		{ key: 'mangas', label: `Truyện tranh (${mangaCount})` },
		{ key: 'members', label: `Thành viên (${members.length})` },
	];

	return (
		<section className="animate-fade-up">
			<div className="overflow-hidden rounded-2xl border border-white/10">
				<Cover
					src={group.coverImageUrl}
					name={group.name}
					className="aspect-[16/6] w-full"
					textClass="text-6xl"
				/>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-4">
				<Cover
					src={group.avatar}
					name={group.name}
					className="h-20 w-20 shrink-0 rounded-2xl border border-white/10"
					textClass="text-3xl"
				/>
				<div className="min-w-0 flex-1">
					<h1 className="text-2xl font-bold text-white">{group.name}</h1>
					<p className="text-sm text-neutral-500">@{group.slug}</p>
				</div>
				<div className="flex items-center gap-2">
					{isLeader && (
						<Button variant="ghost" onClick={() => setEditing(true)}>
							Chỉnh sửa
						</Button>
					)}
					{!isLeader && isAuthenticated && !isMember && pendingRequest && (
						<Badge tone="amber">Chờ duyệt</Badge>
					)}
					{!isLeader && isAuthenticated && !isMember && !pendingRequest && myGroupStatus === 'NONE' && (
						<Button onClick={handleJoin} disabled={joinMutation.loading}>
							Xin tham gia
						</Button>
					)}
				</div>
			</div>

			{group.description && (
				<p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-400">
					{group.description}
				</p>
			)}

			{joinMutation.message && <p className="mt-4 text-sm text-emerald-400">{joinMutation.message}</p>}
			{joinMutation.error && (
				<p className="mt-4 text-sm text-red-400">
					Lỗi ({joinMutation.error.code}): {joinMutation.error.message}
				</p>
			)}
			{groupMutation.error && (
				<p className="mt-4 text-sm text-red-400">
					Lỗi ({groupMutation.error.code}): {groupMutation.error.message}
				</p>
			)}

			<div className="mt-8 flex gap-1 border-b border-white/10">
				{tabs.map((item) => (
					<button
						key={item.key}
						type="button"
						onClick={() => setTab(item.key)}
						className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
							tab === item.key
								? 'border-white text-white'
								: 'border-transparent text-neutral-500 hover:text-neutral-200'
						}`}
					>
						{item.label}
					</button>
				))}
			</div>

			<div className="mt-6">
				{tab === 'mangas' ? (
					<MangaGrid mangas={mangaList} />
				) : (
					<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
						{members.map((member) => (
							<li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
								<Link
									to={`/users/${member.username}`}
									className="group flex items-center gap-3"
								>
									<Avatar
										src={member.avatar}
										name={member.displayName || member.username}
										size={32}
									/>
									<span className="text-sm text-neutral-200 transition-colors duration-200 group-hover:text-white">
										{member.displayName || member.username}
									</span>
									<Badge tone={member.id === group.leader?.id ? 'blue' : 'neutral'}>
										{member.id === group.leader?.id ? 'Leader' : 'Thành viên'}
									</Badge>
								</Link>
								{isLeader && member.id !== group.leader?.id && (
									<span className="flex gap-2">
										<Button variant="ghost" onClick={() => handleTransfer(member)}>
											Chuyển quyền
										</Button>
										<Button variant="danger" onClick={() => handleKick(member)}>
											Kick
										</Button>
									</span>
								)}
							</li>
						))}
					</ul>
				)}
			</div>

			{editing && (
				<EditGroupModal
					group={group}
					avatar={group.avatar}
					onClose={() => setEditing(false)}
					onSaved={() => {
						setEditing(false);
						reloadGroup();
					}}
				/>
			)}

			{isLeader && (
				<section className="mt-10">
					<h2 className="mb-3 text-lg font-semibold text-white">Yêu cầu tham gia (chờ duyệt)</h2>
					{requestMutation.message && (
						<p className="mb-3 text-sm text-emerald-400">{requestMutation.message}</p>
					)}
					{!joinRequests || joinRequests.length === 0 ? (
						<EmptyState>Không có yêu cầu nào.</EmptyState>
					) : (
						<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
							{joinRequests.map((request) => (
								<li key={request.id} className="flex items-center justify-between gap-3 px-4 py-3">
									<span className="flex items-center gap-3 text-sm text-neutral-200">
										{request.user?.displayName ||
											request.user?.username ||
											'Người dùng'}
										<Badge tone={JOIN_REQUEST_TONE[request.status]}>
											{JOIN_REQUEST_STATUS[request.status]}
										</Badge>
									</span>
									<span className="flex gap-2">
										<Button onClick={() => handleRequest(request, 'approve')}>Duyệt</Button>
										<Button variant="ghost" onClick={() => handleRequest(request, 'reject')}>
											Từ chối
										</Button>
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			)}
		</section>
	);
}

export default GroupDetailPage;
