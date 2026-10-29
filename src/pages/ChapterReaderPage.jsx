import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, List, X, RotateCcw, Home, ArrowLeft } from 'lucide-react';
import { ApiError, chapterApi } from '../api';
import { resolveMangaId } from '../utils/resolveUrl';
import { useCurrentUser } from '../hooks/useCurrentUser';
import Avatar from '../components/common/Avatar';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';

const byChapterIndex = (list) => [...list].sort((a, b) => a.chapterIndex - b.chapterIndex);
const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

/**
 * Component hiển thị từng trang ảnh với cơ chế lazy load chuẩn:
 * - Giữ chỗ với min-height lớn (tránh hiện tượng dồn chiều cao khiến tất cả trang dưới lọt vào viewport tải ồ ạt)
 * - Chỉ nạp thẻ ảnh thật khi trang tiến gần vào viewport (rootMargin: 250px)
 */
function ReaderImageItem({ page, index, totalPages, setRef }) {
	const [inView, setInView] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState(false);
	const [retryKey, setRetryKey] = useState(0);
	const containerRef = useRef(null);

	useEffect(() => {
		const node = containerRef.current;
		if (!node || typeof IntersectionObserver === 'undefined') {
			setInView(true);
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ rootMargin: '250px' }, // Chỉ kích hoạt khi còn cách màn hình 250px
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [retryKey]);

	return (
		<div
			ref={(node) => {
				containerRef.current = node;
				setRef(node);
			}}
			data-page-index={index}
			className={`relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center rounded-lg transition-all duration-300 ${
				loaded ? 'min-h-0' : 'min-h-[70vh] sm:min-h-[85vh] bg-ink-900/60 border border-white/5'
			}`}
		>
			{!loaded && !error && (
				<div className="flex flex-col items-center gap-3 text-neutral-500 py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
					<p className="text-xs font-medium tracking-wide">
						Đang tải trang {page.pageNumber} / {totalPages}...
					</p>
				</div>
			)}

			{error && (
				<div className="flex flex-col items-center gap-3 py-16 text-center">
					<p className="text-sm text-rose-400 font-medium">Không thể tải trang {page.pageNumber}</p>
					<button
						type="button"
						onClick={() => {
							setError(false);
							setLoaded(false);
							setRetryKey((k) => k + 1);
						}}
						className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
					>
						<RotateCcw className="h-3.5 w-3.5" />
						Thử tải lại
					</button>
				</div>
			)}

			{inView && (
				<img
					key={`${page.id}-${retryKey}`}
					src={page.imageUrl}
					alt={`Trang ${page.pageNumber}`}
					loading="lazy"
					onLoad={() => setLoaded(true)}
					onError={() => {
						setError(true);
						setLoaded(false);
					}}
					className={`w-full max-w-4xl rounded-md transition-opacity duration-300 ${
						loaded ? 'opacity-100 block' : 'opacity-0 absolute'
					}`}
				/>
			)}
		</div>
	);
}

function ChapterReaderPage() {
	const { slug, chapterIndex } = useParams();
	const { data: me } = useCurrentUser();
	const [pages, setPages] = useState([]);
	const [chapters, setChapters] = useState([]);
	const [status, setStatus] = useState('loading');
	const [error, setError] = useState(null);
	const [open, setOpen] = useState(() =>
		typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
	);
	const requestRef = useRef(0);
	const pageRefs = useRef([]);

	const load = useCallback(async () => {
		const reqId = ++requestRef.current;
		setStatus('loading');
		setError(null);
		setPages([]);

		try {
			const mangaId = await resolveMangaId(slug);
			if (!mangaId) throw new ApiError('404', 'Không tìm thấy truyện.');

			const chapterList = await chapterApi.listByManga(mangaId, {
				page: 0,
				size: 200,
				sortBy: 'chapterIndex',
			});
			const list = byChapterIndex(chapterList?.content ?? []);
			const index = list.findIndex(
				(chapter) => String(chapter.chapterIndex) === String(chapterIndex),
			);
			if (index < 0) throw new ApiError('404', 'Không tìm thấy chương.');
			if (requestRef.current !== reqId) return;
			setChapters(list);

			const result = await chapterApi.getPages(list[index].id, {
				page: 0,
				size: 250,
				sortBy: 'pageNumber',
			});
			if (requestRef.current !== reqId) return;

			const resultList = Array.isArray(result) ? result : (result?.content ?? []);
			setPages([...resultList].sort((a, b) => a.pageNumber - b.pageNumber));
			setStatus('ready');
		} catch (err) {
			if (requestRef.current !== reqId) return;
			setError(err);
			setStatus('error');
		}
	}, [slug, chapterIndex]);

	useEffect(() => {
		window.scrollTo(0, 0);
		load();
	}, [load]);

	const currentIndex = chapters.findIndex(
		(chapter) => String(chapter.chapterIndex) === String(chapterIndex),
	);
	const prev = currentIndex > 0 ? chapters[currentIndex - 1] : null;
	const next =
		currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
	const current = currentIndex >= 0 ? chapters[currentIndex] : null;

	const closeOnMobile = () => {
		if (isMobile()) setOpen(false);
	};

	const jumpToPage = (index) => {
		const target = pageRefs.current[index];
		if (target) {
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		closeOnMobile();
	};

	if (status === 'loading') return <Loading label="Đang tải chương truyện..." />;
	if (status === 'error') return <ErrorMessage error={error} onRetry={load} />;

	const navButtonClass =
		'inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition-all duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white shadow-lg';
	const disabledClass = 'pointer-events-none opacity-30';

	return (
		<div className="min-h-screen bg-ink-950 text-neutral-100">
			{/* Top Bar tiện ích khi đọc */}
			<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-ink-950/85 px-4 backdrop-blur-md">
				<div className="flex items-center gap-3 min-w-0">
					<Link
						to={`/mangas/${slug}`}
						className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Trở về truyện
					</Link>
					<span className="truncate text-sm font-bold text-white">
						Ảo Truyện <span className="text-neutral-500 font-normal">|</span> Chương {chapterIndex}
						{current?.title ? ` — ${current.title}` : ''}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setOpen((prev) => !prev)}
						className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:bg-white/10 hover:text-white"
					>
						<List className="h-4 w-4" />
						<span className="hidden sm:inline">Mục lục</span>
					</button>
				</div>
			</header>

			{/* Nội dung đọc truyện: có padding phải khi mở aside trên desktop */}
			<div className={`transition-[margin] duration-300 ${open ? 'lg:mr-80' : ''}`}>
				<main className="mx-auto w-full max-w-4xl px-2 py-4 sm:px-4">
					{pages.length === 0 ? (
						<p className="py-20 text-center text-neutral-500 font-medium">Chương này chưa có ảnh.</p>
					) : (
						<div className="flex flex-col gap-3">
							{pages.map((page, index) => (
								<ReaderImageItem
									key={page.id}
									page={page}
									index={index}
									totalPages={pages.length}
									setRef={(node) => {
										pageRefs.current[index] = node;
									}}
								/>
							))}
						</div>
					)}

					{/* Chuyển chương cuối trang */}
					<div className="mx-auto mt-10 flex max-w-4xl items-center justify-between gap-3 border-t border-white/10 pt-6 pb-12">
						<Link
							to={`/mangas/${slug}/chapters/${prev?.chapterIndex}`}
							onClick={closeOnMobile}
							className={`${navButtonClass} ${!prev ? disabledClass : ''}`}
						>
							<ChevronLeft className="h-4 w-4" />
							Chương trước
						</Link>
						<span className="text-xs text-neutral-500 font-medium">
							Chương {chapterIndex} / {chapters.length}
						</span>
						<Link
							to={`/mangas/${slug}/chapters/${next?.chapterIndex}`}
							onClick={closeOnMobile}
							className={`${navButtonClass} ${!next ? disabledClass : ''}`}
						>
							Chương sau
							<ChevronRight className="h-4 w-4" />
						</Link>
					</div>
				</main>
			</div>

			{/* Nền mờ trên mobile khi mở sidebar */}
			{open && (
				<div
					onClick={() => setOpen(false)}
					aria-label="Đóng danh sách"
					className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
				/>
			)}

			{/* Tab bên phải: thông tin user, danh sách chương, danh sách trang */}
			<aside
				aria-hidden={!open}
				className={`fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col border-l border-white/10 bg-ink-900 shadow-2xl transition-transform duration-300 ${
					open ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="flex items-center justify-between border-b border-white/10 p-4">
					<div className="min-w-0">
						<p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Đang đọc</p>
						<p className="truncate text-sm font-bold text-white">
							Chương {chapterIndex}
							{current?.title ? ` — ${current.title}` : ''}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setOpen(false)}
						aria-label="Đóng danh sách"
						className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-6">
					{me && (
						<Link
							to={`/users/${me.username}`}
							className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors duration-200 hover:border-white/25 hover:bg-white/10"
						>
							<Avatar src={me.avatar} name={me.displayName || me.username} size={36} />
							<span className="min-w-0">
								<span className="block truncate text-sm font-semibold text-white">
									{me.displayName || me.username}
								</span>
								<span className="block text-xs text-neutral-400">Trang cá nhân</span>
							</span>
						</Link>
					)}

					<section>
						<div className="mb-2.5 flex items-center justify-between">
							<h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
								Danh sách chương ({chapters.length})
							</h3>
						</div>
						<ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
							{chapters.map((chapter) => {
								const active = String(chapter.chapterIndex) === String(chapterIndex);
								return (
									<li key={chapter.id}>
										<Link
											to={`/mangas/${slug}/chapters/${chapter.chapterIndex}`}
											onClick={closeOnMobile}
											className={`block truncate rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-200 ${
												active
													? 'bg-white font-bold text-ink-950'
													: 'text-neutral-300 hover:bg-white/10 hover:text-white'
											}`}
										>
											Chương {chapter.chapterIndex}
											{chapter.title ? ` — ${chapter.title}` : ''}
										</Link>
									</li>
								);
							})}
						</ul>
					</section>

					<section>
						<h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400">
							Chuyển trang ({pages.length})
						</h3>
						<div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
							{pages.map((page, index) => (
								<button
									key={page.id}
									type="button"
									onClick={() => jumpToPage(index)}
									className="rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-white/30 hover:bg-white/15 hover:text-white"
								>
									{page.pageNumber}
								</button>
							))}
						</div>
					</section>

					<div className="pt-2">
						<Link
							to={`/mangas/${slug}`}
							className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
						>
							<Home className="h-4 w-4" />
							Về trang chi tiết truyện
						</Link>
					</div>
				</div>
			</aside>
		</div>
	);
}

export default ChapterReaderPage;
