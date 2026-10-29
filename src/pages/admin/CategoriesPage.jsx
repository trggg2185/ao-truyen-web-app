import { useState } from 'react';
import { categoryApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

function CategoriesPage() {
	const [form, setForm] = useState({ name: '', description: '' });
	const [editing, setEditing] = useState(null);
	const mutation = useMutation();
	const confirm = useConfirm();
	const toast = useToast();

	const { data: categories, error, loading, reload } = useFetch(() => categoryApi.list(), []);

	const submit = async (e) => {
		e.preventDefault();
		if (!form.name.trim()) {
			toast.warning('Vui lòng nhập tên thể loại.');
			return;
		}

		if (
			editing &&
			form.name === (editing.name ?? '') &&
			form.description === (editing.description ?? '')
		) {
			toast.info('Không có thay đổi nào.');
			return;
		}

		const ok = await confirm({
			title: editing ? `Cập nhật thể loại "${editing.name}"?` : 'Tạo thể loại mới?',
			message: editing
				? `Lưu các thay đổi cho thể loại "${form.name}"?`
				: `Xác nhận tạo thể loại mới "${form.name}" vào hệ thống?`,
			confirmText: editing ? 'Lưu cập nhật' : 'Tạo thể loại',
			tone: 'primary',
		});
		if (!ok) return;

		mutation.run(async () => {
			if (editing) await categoryApi.update(editing.id, form);
			else await categoryApi.create(form);
			toast.success(editing ? `Đã cập nhật thể loại "${form.name}".` : `Đã tạo thể loại "${form.name}".`);
			setForm({ name: '', description: '' });
			setEditing(null);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi lưu thể loại.');
		});
	};

	const startEdit = (category) => {
		setEditing(category);
		setForm({ name: category.name ?? '', description: category.description ?? '' });
	};

	const handleDelete = async (category) => {
		const ok = await confirm({
			title: `Xác nhận xóa thể loại "${category.name}"?`,
			message: 'Hành động này sẽ xóa thể loại khỏi hệ thống. Các bộ truyện thuộc thể loại này sẽ không còn gắn nhãn này nữa.',
			confirmText: 'Xác nhận xóa',
			tone: 'danger',
		});
		if (!ok) return;

		mutation.run(async () => {
			await categoryApi.remove(category.id);
			toast.success(`Đã xóa thể loại "${category.name}".`);
			reload();
		}).catch((err) => {
			toast.error(err.message || 'Lỗi khi xóa thể loại.');
		});
	};

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-xl h-fit">
				<h2 className="text-lg font-bold text-white">
					{editing ? `Chỉnh sửa: ${editing.name}` : 'Tạo thể loại mới'}
				</h2>
				<Input
					label="Tên thể loại (*)"
					placeholder="Ví dụ: Hành động, Tình cảm..."
					value={form.name}
					onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
					required
				/>
				<Input
					label="Mô tả thể loại (tuỳ chọn)"
					placeholder="Mô tả đặc điểm thể loại này..."
					value={form.description}
					onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
				/>

				<div className="flex gap-2 pt-2">
					<Button type="submit" disabled={mutation.loading} className="font-semibold">
						{mutation.loading ? 'Đang lưu...' : editing ? 'Lưu cập nhật' : 'Tạo thể loại'}
					</Button>
					{editing && (
						<Button
							variant="ghost"
							onClick={() => {
								setEditing(null);
								setForm({ name: '', description: '' });
							}}
						>
							Huỷ bỏ
						</Button>
					)}
				</div>
			</form>

			<div>
				<h2 className="mb-3 text-lg font-bold text-white">
					Danh sách thể loại ({categories?.length ?? 0})
				</h2>
				{loading ? (
					<Loading />
				) : error ? (
					<ErrorMessage error={error} onRetry={reload} />
				) : categories?.length === 0 ? (
					<EmptyState>Chưa có thể loại nào.</EmptyState>
				) : (
					<ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-xl max-h-[38rem] overflow-y-auto">
						{categories?.map((category) => (
							<li key={category.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
								<div>
									<span className="text-sm font-semibold text-neutral-100">{category.name}</span>
									{category.description && (
										<p className="text-xs text-neutral-400 mt-0.5">{category.description}</p>
									)}
								</div>
								<span className="flex gap-2">
									<Button variant="ghost" onClick={() => startEdit(category)} className="text-xs">
										Sửa
									</Button>
									<Button variant="danger" onClick={() => handleDelete(category)} className="text-xs">
										Xoá
									</Button>
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

export default CategoriesPage;
