import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

/** Up to five page numbers around the current page. */
function pageNumbers(page, totalPages) {
  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const last = Math.min(totalPages, first + 4);
  const numbers = [];
  for (let number = first; number <= last; number++) {
    numbers.push(number);
  }
  return numbers;
}

/** "Showing 1–20 of 34" with previous, page numbers and next (pages of 20, as every list in the API). */
export function Pager({ page, size, totalItems, totalPages, onPage, suffix = '' }) {
  if (totalItems === 0) {
    return null;
  }
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, totalItems);
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm text-muted" aria-label="Pages">
      <span>
        Showing {from}–{to} of {totalItems}
        {suffix}
      </span>
      {totalPages > 1 && (
        <div className="flex gap-1.5">
          <PageButton label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <IconChevronLeft size={17} aria-hidden="true" />
          </PageButton>
          {pageNumbers(page, totalPages).map((number) => (
            <PageButton key={number} label={`Page ${number}`} current={number === page} onClick={() => onPage(number)}>
              {number}
            </PageButton>
          ))}
          <PageButton label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            <IconChevronRight size={17} aria-hidden="true" />
          </PageButton>
        </div>
      )}
    </nav>
  );
}

function PageButton({ label, current = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-[34px] min-w-[34px] place-items-center rounded-[9px] border font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        current ? 'border-brand bg-brand text-white' : 'border-line bg-white text-navy'
      }`}
    >
      {children}
    </button>
  );
}
