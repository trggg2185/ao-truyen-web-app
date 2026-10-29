import { Link } from "react-router-dom";
import { mangaApi } from "../api";
import { useFetch } from "../hooks/useFetch";
import MangaGrid from "../components/manga/MangaGrid";
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";

function HomePage() {
    // Top 20 truyện mới cập nhật gần đây (GET /mangas/recently-updated)
    const {
        data: top20,
        error: errorTop20,
        loading: loadingTop20,
        reload: reloadTop20,
    } = useFetch(() => mangaApi.getTop20(), []);

    // Top 10 truyện mới ra mắt có ít nhất 1 chương (GET /mangas/newly)
    const {
        data: top10,
        error: errorTop10,
        loading: loadingTop10,
        reload: reloadTop10,
    } = useFetch(() => mangaApi.getTop10(), []);

    return (
        <div className="space-y-12">
            {/* Hero / Chào mừng */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 sm:p-10">
                <div className="relative z-10 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Chào mừng đến với Ảo Truyện
                    </span>
                    <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">
                        Khám phá thế giới Manga đặc sắc tại Ảo Truyện
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-300 sm:text-base">
                        Đọc truyện tranh miễn phí với chất lượng hình ảnh sắc nét, tốc độ tải trang cực nhanh và các bản dịch tâm huyết từ cộng đồng nhóm dịch.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                            to="/manga"
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition-colors duration-200 hover:bg-neutral-200"
                        >
                            Duyệt toàn bộ truyện
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="h-4 w-4"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                        <Link
                            to="/groups"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                        >
                            Danh sách nhóm dịch
                        </Link>
                    </div>
                </div>
            </div>

            {/* Section 1: Top 20 Truyện Mới Cập Nhật */}
            <section>
                <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                Mới Cập Nhật Gần Đây
                            </h2>
                            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                                Top 20
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
                            Các bộ truyện vừa có chương mới nhất
                        </p>
                    </div>
                    <Link
                        to="/manga"
                        className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-white sm:text-sm"
                    >
                        Xem tất cả
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </Link>
                </div>

                {loadingTop20 ? (
                    <Loading label="Đang tải truyện mới cập nhật..." />
                ) : errorTop20 ? (
                    <ErrorMessage error={errorTop20} onRetry={reloadTop20} />
                ) : (
                    <MangaGrid mangas={top20 ?? []} />
                )}
            </section>

            {/* Section 2: Top 10 Truyện Mới Ra Mắt */}
            <section>
                <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                Truyện Mới Ra Mắt
                            </h2>
                            <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-300">
                                Top 10
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
                            Những tác phẩm mới gia nhập thư viện có chương đọc ngay
                        </p>
                    </div>
                    <Link
                        to="/manga"
                        className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-white sm:text-sm"
                    >
                        Xem tất cả
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden="true"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </Link>
                </div>

                {loadingTop10 ? (
                    <Loading label="Đang tải truyện mới ra mắt..." />
                ) : errorTop10 ? (
                    <ErrorMessage error={errorTop10} onRetry={reloadTop10} />
                ) : (
                    <MangaGrid mangas={top10 ?? []} />
                )}
            </section>
        </div>
    );
}

export default HomePage;
