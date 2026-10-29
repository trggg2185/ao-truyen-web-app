import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Button from '../components/common/Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
	const [dialog, setDialog] = useState(null);
	const resolverRef = useRef(null);

	const confirm = useCallback(
		({
			title = 'Xác nhận thao tác',
			message = 'Bạn có chắc chắn muốn thực hiện hành động này không?',
			confirmText = 'Xác nhận',
			cancelText = 'Hủy bỏ',
			tone = 'primary', // 'primary' | 'danger'
		} = {}) => {
			return new Promise((resolve) => {
				resolverRef.current = resolve;
				setDialog({
					title,
					message,
					confirmText,
					cancelText,
					tone,
				});
			});
		},
		[],
	);

	const handleClose = useCallback((result) => {
		if (resolverRef.current) {
			resolverRef.current(result);
			resolverRef.current = null;
		}
		setDialog(null);
	}, []);

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{dialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
						onClick={() => handleClose(false)}
					/>
					<div
						role="dialog"
						aria-modal="true"
						className="animate-fade-up relative w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
					>
						<div className="flex items-start gap-4">
							<div
								className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
									dialog.tone === 'danger'
										? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
										: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
								}`}
							>
								{dialog.tone === 'danger' ? (
									<AlertTriangle className="h-6 w-6" />
								) : (
									<HelpCircle className="h-6 w-6" />
								)}
							</div>
							<div className="flex-1">
								<h3 className="text-base font-bold text-white">{dialog.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-neutral-300">
									{dialog.message}
								</p>
							</div>
						</div>

						<div className="mt-6 flex items-center justify-end gap-3">
							<Button
								variant="ghost"
								onClick={() => handleClose(false)}
								className="px-4 py-2"
							>
								{dialog.cancelText}
							</Button>
							<Button
								variant={dialog.tone === 'danger' ? 'danger' : 'primary'}
								onClick={() => handleClose(true)}
								className="px-4 py-2"
							>
								{dialog.confirmText}
							</Button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
}

export function useConfirm() {
	const context = useContext(ConfirmContext);
	if (!context) {
		throw new Error('useConfirm must be used within a ConfirmProvider');
	}
	return context;
}
