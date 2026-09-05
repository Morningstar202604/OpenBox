import { SearchAutocomplete } from './SearchAutocomplete';

export function SearchBox({
  initial = '',
  autoFocus = false,
  big = false,
}: {
  initial?: string;
  autoFocus?: boolean;
  big?: boolean;
}) {
  return <SearchAutocomplete initial={initial} autoFocus={autoFocus} big={big} />;
}
