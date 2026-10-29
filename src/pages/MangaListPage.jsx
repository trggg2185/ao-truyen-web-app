import { useState } from "react";
import { categoryApi, mangaApi } from "../api";
import { useFetch } from "../hooks/useFetch";
import MangaGrid from "../components/manga/MangaGrid";
import Pagination from "../components/common/Pagination";
import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import PageHeader from "../components/common/PageHeader";

function MangaListPage() {
    const [page, setPage] = useState(0);
    const [categoryId, setCategoryId] = useState("");

    const { data, error, loading, reload } = useFetch(
        () => mangaApi.list({ page, size: 24, sortBy: "createdAt" }),
        [page],
    );
    const { data: categories } = useFetch(() => categoryApi.list(), []);

    const goToPage = (next) => {
        setPage(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Lọc theo thể loại ở client trên trang hiện tại
    const mangas = categoryId
        ? (data?.content ?? []).filter((manga) =>
              manga.categories?.some((category) => String(category.id) === categoryId),
          )
        : data?.content;

    const chipClass = (active) =>
        `rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200 ${
            active
                ? "border-white/40 bg-white text-ink-950 font-medium"
                : "border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
        }`;

    return (
        <section>
            <PageHeader
                title="Tất cả truyện tranh"
                subtitle={
                    data ? `${data.totalElements} bộ truyện đang có mặt trên hệ thống` : "Đang cập nhật danh sách..."
                }
            />

            <div className="mb-6 flex flex-wrap gap-2">
                <button
                    type="button"
                    className={chipClass(!categoryId)}
                    onClick={() => setCategoryId("")}
                >
                    Tất cả
                </button>
                {categories?.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        className={chipClass(categoryId === String(category.id))}
                        onClick={() => setCategoryId(String(category.id))}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <Loading label="Đang tải danh sách truyện..." />
            ) : error ? (
                <ErrorMessage error={error} onRetry={reload} />
            ) : (
                <>
                    <MangaGrid mangas={mangas} />
                    <Pagination
                        page={page}
                        totalPages={data?.totalPages}
                        onChange={goToPage}
                    />
                </>
            )}
        </section>
    );
}

export default MangaListPage;
