import { useEffect, useState } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadApi } from '../../api';
import { useMutation } from '../../hooks/useMutation';
import { useToast } from '../../context/ToastContext';

export default function ImageUploadField({ label = 'Ảnh bìa truyện', value, onChange }) {
	const [preview, setPreview] = useState(null);
	const mutation = useMutation();
	const toast = useToast();

	useEffect(
		() => () => {
			if (preview) URL.revokeObjectURL(preview);
		},
		[preview],
	);

	const handleChange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setPreview(URL.createObjectURL(file));
		mutation.run(async () => {
			const url = await uploadApi.upload(file);
			onChange(url);
			toast.success('Đã tải lên ảnh bìa thành công!');
		}).catch((err) => {
			toast.error(err.message || 'Lỗi tải ảnh bìa');
		});
	};

	const shown = preview || value;

	return (
		<div>
			<span className="mb-2 block text-sm font-semibold text-neutral-200">{label}</span>
			<div className="flex flex-col sm:flex-row items-start gap-4">
				<div className="relative flex h-64 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-ink-950 shadow-md">
					{shown ? (
						<img src={shown} alt="Ảnh xem trước" className="h-full w-full object-cover" />
					) : (
						<div className="flex flex-col items-center gap-2 text-neutral-500">
							<ImageIcon className="h-10 w-10 text-neutral-600" />
							<span className="text-xs">Chưa có ảnh bìa</span>
						</div>
					)}
					{mutation.loading && (
						<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
							<span className="mt-2 text-xs font-medium text-white">Đang tải...</span>
						</div>
					)}
				</div>

				<div className="flex flex-col justify-center py-2 space-y-3">
					<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/40">
						<Upload className="h-4 w-4 text-emerald-400" />
						{shown ? 'Đổi ảnh bìa khác' : 'Chọn ảnh bìa từ máy tính'}
						<input type="file" accept="image/*" className="hidden" onChange={handleChange} />
					</label>

					<div className="space-y-1 text-xs text-neutral-400">
						<p>• Định dạng được hỗ trợ: JPG, PNG, WEBP</p>
						<p>• Dung lượng tối đa: 5MB</p>
						<p>• Tỷ lệ khuyến nghị: 3:4 để hiển thị chuẩn nhất trên mọi thiết bị</p>
					</div>

					{shown && !mutation.loading && (
						<div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
							<CheckCircle2 className="h-4 w-4" />
							Ảnh bìa đã sẵn sàng
						</div>
					)}

					{mutation.error && (
						<div className="flex items-center gap-1.5 text-xs text-rose-400">
							<AlertCircle className="h-4 w-4" />
							Lỗi: {mutation.error.message}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
