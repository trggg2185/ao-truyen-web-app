import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useAuth } from '../auth/useAuth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useMutation } from '../hooks/useMutation';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Avatar from '../components/common/Avatar';

function ProfilePage() {
	const { data: me, error, loading, reload } = useCurrentUser();
	const { logout } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({ displayName: '', facebook: '', discord: '', bio: '', avatar: null });
	const [avatarPreview, setAvatarPreview] = useState(null);

	const profileMutation = useMutation();
	const deleteMutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	// Thu hồi object URL khi đổi ảnh preview hoặc rời trang.
	useEffect(
		() => () => {
			if (avatarPreview) URL.revokeObjectURL(avatarPreview);
		},
		[avatarPreview],
	);

	useEffect(() => {
		if (!me) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect -- nạp dữ liệu server vào form một lần
		setForm({
			displayName: me.displayName ?? '',
			facebook: me.facebook ?? '',
			discord: me.discord ?? '',
			bio: me.bio ?? '',
			avatar: null,
		});
	}, [me]);

	if (loading) return <Loading label="Đang tải hồ sơ..." />;
	if (error) return <ErrorMessage error={error} onRetry={reload} />;

	const handleAvatarChange = (e) => {
		const file = e.target.files?.[0] ?? null;
		setForm((f) => ({ ...f, avatar: file }));
		setAvatarPreview(file ? URL.createObjectURL(file) : null);
	};

	const submitProfile = async (e) => {
		e.preventDefault();
		const unchanged =
			!form.avatar &&
			form.displayName === (me?.displayName ?? '') &&
			form.facebook === (me?.facebook ?? '') &&
			form.discord === (me?.discord ?? '') &&
			form.bio === (me?.bio ?? '');
		if (unchanged) {
			toast.info('Không có thay đổi nào.');
			return;
		}

		const ok = await confirm({
			title: 'Cập nhật hồ sơ cá nhân?',
			message: 'Bạn có chắc muốn lưu những thay đổi này trên hồ sơ không?',
			confirmText: 'Lưu thay đổi',
			tone: 'primary',
		});
		if (!ok) return;

		profileMutation.run(async () => {
			await userApi.updateMe(form);
			setAvatarPreview(null);
			toast.success('Đã cập nhật thông tin hồ sơ thành công!');
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi cập nhật hồ sơ.');
		});
	};

	const handleDeleteAccount = async () => {
		const ok = await confirm({
			title: 'XÓA TÀI KHOẢN VĨNH VIỄN?',
			message: 'Cảnh báo: Toàn bộ thông tin tài khoản của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục. Bạn có chắc chắn muốn xóa không?',
			confirmText: 'Tôi hiểu và muốn xóa tài khoản',
			tone: 'danger',
		});
		if (!ok) return;

		deleteMutation.run(async () => {
			await userApi.deleteMe();
			toast.success('Đã xóa tài khoản thành công.');
			await logout();
			navigate('/');
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xóa tài khoản.');
		});
	};

	return (
		<section className="animate-fade-up">
			<PageHeader
				title="Hồ sơ của tôi"
				subtitle={me ? `@${me.username}` : ''}
				actions={
					<Link to="/my/join-requests">
						<Button variant="ghost">Yêu cầu của tôi</Button>
					</Link>
				}
			/>

			<form
				onSubmit={submitProfile}
				className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-ink-900 p-6"
			>
				<h2 className="text-lg font-semibold text-white">Thông tin</h2>

				<div className="grid gap-4 sm:grid-cols-2">
					<Input
						label="Tên đăng nhập"
						value={me?.username ?? ''}
						disabled
						className="cursor-not-allowed opacity-60"
					/>
					<Input
						label="Email"
						value={me?.email ?? ''}
						placeholder="Chưa có email"
						disabled
						className="cursor-not-allowed opacity-60"
					/>
				</div>
				<p className="-mt-2 text-xs text-neutral-600">
					Tên đăng nhập và email không thể thay đổi.
				</p>

				<Input
					label="Tên hiển thị (tối đa 50 ký tự)"
					maxLength={50}
					value={form.displayName}
					onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
					placeholder={me?.username}
				/>
				<Input
					label="Facebook"
					value={form.facebook}
					onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
				/>
				<Input
					label="Discord"
					value={form.discord}
					onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))}
				/>
				<Textarea
					label="Giới thiệu (tối đa 300 ký tự)"
					maxLength={300}
					value={form.bio}
					onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
				/>
				<div>
					<span className="mb-1.5 block text-sm text-neutral-400">Avatar</span>
					<div className="flex items-center gap-4">
						<Avatar src={avatarPreview || me?.avatar} name={me?.displayName || me?.username} size={72} />
						<div>
							<label className="inline-block cursor-pointer rounded-lg border border-white/15 px-3.5 py-2 text-sm text-neutral-200 transition-colors duration-200 hover:border-white/30 hover:bg-white/5">
								{avatarPreview ? 'Chọn ảnh khác' : 'Chọn ảnh'}
								<input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
							</label>
							<p className="mt-1 text-xs text-neutral-600">
								{avatarPreview ? 'Xem trước ảnh mới — lưu để áp dụng.' : 'PNG/JPG, tối đa 5MB.'}
							</p>
						</div>
					</div>
				</div>

				{profileMutation.error && (
					<p className="text-sm text-red-400">
						Lỗi ({profileMutation.error.code}): {profileMutation.error.message}
					</p>
				)}
				{profileMutation.message && <p className="text-sm text-emerald-400">{profileMutation.message}</p>}

				<Button type="submit" disabled={profileMutation.loading}>
					{profileMutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
				</Button>

				{me?.createdAt && (
					<p className="text-xs text-neutral-600">Tham gia ngày {formatDateTime(me.createdAt)}</p>
				)}
			</form>

			<section className="mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
				<h2 className="text-lg font-semibold text-red-300">Xoá tài khoản</h2>
				<p className="mt-1 text-sm text-neutral-400">
					Tài khoản sẽ bị ẩn danh, đăng xuất khỏi mọi thiết bị và không thể khôi phục.
					Nếu bạn đang là leader, hãy chuyển quyền leader trước khi xoá.
				</p>
				{deleteMutation.error && (
					<p className="mt-3 text-sm text-red-400">
						Lỗi ({deleteMutation.error.code}): {deleteMutation.error.message}
					</p>
				)}
				<Button
					variant="danger"
					className="mt-4"
					onClick={handleDeleteAccount}
					disabled={deleteMutation.loading}
				>
					{deleteMutation.loading ? 'Đang xoá...' : 'Xoá tài khoản'}
				</Button>
			</section>
		</section>
	);
}

export default ProfilePage;
