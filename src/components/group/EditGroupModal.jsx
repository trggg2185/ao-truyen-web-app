import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { groupApi } from '../../api';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';

function ImageFileField({ label, file, current, boxClass = 'h-24 w-36', onChange }) {
	const [preview, setPreview] = useState(null);

	useEffect(
		() => () => {
			if (preview) URL.revokeObjectURL(preview);
		},
		[preview],
	);

	const pick = (event) => {
		const next = event.target.files?.[0];
		if (!next) return;
		setPreview(URL.createObjectURL(next));
		onChange(next);
	};

	const shown = preview || current;

	return (
		<div>
			<span className="mb-1.5 block text-sm font-semibold text-neutral-300">{label}</span>
			<div className="flex items-center gap-4">
				<div
					className={`flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-inner ${boxClass}`}
				>
					{shown ? (
						<img src={shown} alt={label} className="h-full w-full object-cover" />
					) : (
						<span className="text-xs text-neutral-600">Chưa có ảnh</span>
					)}
				</div>
				<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white">
					<Upload className="h-3.5 w-3.5 text-emerald-400" />
					{shown ? 'Đổi ảnh khác' : 'Chọn ảnh'}
					<input type="file" accept="image/*" className="hidden" onChange={pick} />
				</label>
			</div>
		</div>
	);
}

export default function EditGroupModal({ group, avatar, onClose, onSaved }) {
	const [form, setForm] = useState({
		name: group.name ?? '',
		description: group.description ?? '',
		coverFile: null,
		avatarFile: null,
	});
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const submit = async (event) => {
		event.preventDefault();
		const payload = new FormData();
		if (form.name.trim()) payload.append('name', form.name);
		if (form.description.trim()) payload.append('description', form.description);
		if (form.coverFile) payload.append('coverFile', form.coverFile);
		if (form.avatarFile) payload.append('avatarFile', form.avatarFile);

		const unchanged =
			!form.coverFile &&
			!form.avatarFile &&
			form.name === (group.name ?? '') &&
			form.description === (group.description ?? '');
		const hasField =
			payload.has('name') || payload.has('description') || payload.has('coverFile') || payload.has('avatarFile');
		if (unchanged || !hasField) {
			toast.info('Không có thay đổi nào.');
			return;
		}

		const ok = await confirm({
			title: 'Lưu thay đổi nhóm dịch?',
			message: `Bạn có chắc muốn cập nhật thông tin nhóm "${group.name}" không?`,
			confirmText: 'Lưu thay đổi',
			tone: 'primary',
		});
		if (!ok) return;

		mutation.run(async () => {
			await groupApi.update(group.id, payload);
			toast.success('Đã cập nhật thông tin nhóm dịch thành công!');
			onSaved();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi cập nhật nhóm dịch.');
		});
	};

	return (
		<Modal title="Chỉnh sửa thông tin nhóm" onClose={onClose} maxWidth="max-w-lg">
			<form onSubmit={submit} className="space-y-4">
				<Input
					label="Tên nhóm (5..50 ký tự) (*)"
					value={form.name}
					onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
					required
				/>
				<ImageFileField
					label="Ảnh bìa nhóm"
					current={group.coverImageUrl}
					file={form.coverFile}
					onChange={(file) => setForm((f) => ({ ...f, coverFile: file }))}
				/>
				<ImageFileField
					label="Ảnh đại diện nhóm (Avatar)"
					current={avatar}
					file={form.avatarFile}
					boxClass="h-20 w-20"
					onChange={(file) => setForm((f) => ({ ...f, avatarFile: file }))}
				/>
				<Textarea
					label="Mô tả nhóm (Tối đa 300 ký tự)"
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
						{mutation.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
