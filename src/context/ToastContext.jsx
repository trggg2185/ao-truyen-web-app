import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let nextToastId = 1;

export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);

	const removeToast = useCallback((id) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback(
		({ type = 'info', title, message, duration = 4000 }) => {
			const id = nextToastId++;
			const newToast = { id, type, title, message };

			setToasts((prev) => [...prev, newToast]);

			if (duration > 0) {
				setTimeout(() => {
					removeToast(id);
				}, duration);
			}
			return id;
		},
		[removeToast],
	);

	const toast = {
		success: (message, title = 'Thành công') =>
			addToast({ type: 'success', title, message }),
		error: (message, title = 'Có lỗi xảy ra') =>
			addToast({ type: 'error', title, message }),
		warning: (message, title = 'Cảnh báo') =>
			addToast({ type: 'warning', title, message }),
		info: (message, title = 'Thông báo') =>
			addToast({ type: 'info', title, message }),
		dismiss: removeToast,
	};

	return (
		<ToastContext.Provider value={toast}>
			{children}
			{/* Cửa sổ trượt thông báo ở phía trên bên phải */}
			<div
				aria-live="polite"
				className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2.5 sm:right-6 sm:top-6"
			>
				{toasts.map((item) => (
					<ToastItem key={item.id} item={item} onClose={() => removeToast(item.id)} />
				))}
			</div>
		</ToastContext.Provider>
	);
}

function ToastItem({ item, onClose }) {
	const config = {
		success: {
			icon: CheckCircle2,
			iconClass: 'text-emerald-400',
			borderClass: 'border-emerald-500/30',
			bgClass: 'bg-emerald-950/90',
			titleClass: 'text-emerald-200',
		},
		error: {
			icon: XCircle,
			iconClass: 'text-rose-400',
			borderClass: 'border-rose-500/30',
			bgClass: 'bg-rose-950/90',
			titleClass: 'text-rose-200',
		},
		warning: {
			icon: AlertTriangle,
			iconClass: 'text-amber-400',
			borderClass: 'border-amber-500/30',
			bgClass: 'bg-amber-950/90',
			titleClass: 'text-amber-200',
		},
		info: {
			icon: Info,
			iconClass: 'text-sky-400',
			borderClass: 'border-sky-500/30',
			bgClass: 'bg-sky-950/90',
			titleClass: 'text-sky-200',
		},
	}[item.type] || {
		icon: Info,
		iconClass: 'text-neutral-400',
		borderClass: 'border-white/20',
		bgClass: 'bg-ink-900/95',
		titleClass: 'text-white',
	};

	const Icon = config.icon;

	return (
		<div
			className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in-right ${config.bgClass} ${config.borderClass}`}
			role="alert"
		>
			<Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} />
			<div className="flex-1 min-w-0">
				{item.title && (
					<h4 className={`text-sm font-semibold tracking-wide ${config.titleClass}`}>
						{item.title}
					</h4>
				)}
				<p className="mt-0.5 text-xs leading-relaxed text-neutral-200 whitespace-pre-line">
					{item.message}
				</p>
			</div>
			<button
				type="button"
				onClick={onClose}
				aria-label="Đóng thông báo"
				className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
}
