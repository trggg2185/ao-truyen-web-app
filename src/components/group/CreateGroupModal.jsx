import { useState } from 'react';
import { creationRequestApi } from '../../api';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';

export default function CreateGroupModal({ onClose, onCreated }) {
	const [form, setForm] = useState({ groupName: '', description: '' });
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const submit = async (e) => {
		e.preventDefault();
		if (form.groupName.trim().length < 5) {
			toast.warning('Tên nhóm phải có ít nhất 5 ký tự.');
			return;
		}

		const ok = await confirm({
			title: 'Gửi yêu cầu thành lập nhóm dịch?',
			message: `Bạn muốn gửi yêu cầu thành lập nhóm "${form.groupName}" tới Quản trị viên duyệt?`,
			confirmText: 'Gửi yêu cầu ngay',
			tone: 'primary',
		});
		if (!ok) return;

		mutation.run(async () => {
			await creationRequestApi.create(form);
			toast.success('Đã gửi yêu cầu thành lập nhóm thành công. Vui lòng chờ admin phê duyệt!');
			onCreated();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi gửi yêu cầu thành lập nhóm.');
		});
	};

	return (
		<Modal title="Tạo nhóm dịch mới" onClose={onClose}>
			<form onSubmit={submit} className="space-y-4">
				<Input
					label="Tên nhóm dịch (5..50 ký tự) (*)"
					placeholder="Nhập tên nhóm..."
					value={form.groupName}
					onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))}
					required
				/>
				<Textarea
					label="Mô tả nhóm (tuỳ chọn, tối đa 300 ký tự)"
					placeholder="Giới thiệu đôi nét về nhóm dịch của bạn..."
					maxLength={300}
					rows={3}
					value={form.description}
					onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
				/>

				<div className="flex justify-end gap-2 pt-2">
					<Button variant="ghost" onClick={onClose}>
						Huỷ bỏ
					</Button>
					<Button type="submit" disabled={mutation.loading} className="font-semibold">
						{mutation.loading ? 'Đang gửi...' : 'Gửi yêu cầu tạo nhóm'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
