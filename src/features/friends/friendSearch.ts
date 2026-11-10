// Reads the friend search field the way account-service reads the query, so the
// screen can search only when there's something the server can match, and say
// what's missing otherwise.

export const MIN_SEARCH_LENGTH = 2;

export type SearchInput =
  // Too short to search.
  | { kind: 'empty' }
  | { kind: 'name'; term: string }
  // An email address is only matched whole, so `complete` says whether it's worth sending yet.
  | { kind: 'email'; term: string; complete: boolean }
  | { kind: 'friendCode'; code: string }
  // Digits that aren't a friend code yet, such as half of one.
  | { kind: 'partialCode' };

// Same rule as the friend_code column: 8 digits, never starting with 0.
const FRIEND_CODE = /^[1-9][0-9]{7}$/;
const DIGITS = /^[0-9]+$/;
const COMPLETE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}\.?$/;

export function readSearchInput(text: string): SearchInput {
  const trimmed = text.trim();
  if (trimmed.length < MIN_SEARCH_LENGTH) {
    return { kind: 'empty' };
  }

  // A code may be copied as "#4821 7730" or read out as "4821-7730".
  const digits = trimmed.replace(/^#/, '').replace(/[\s-]/g, '');
  if (FRIEND_CODE.test(digits)) {
    return { kind: 'friendCode', code: digits };
  }
  if (DIGITS.test(digits)) {
    return { kind: 'partialCode' };
  }

  if (trimmed.includes('@')) {
    const email = trimmed.replace(/\s/g, '').replace(/^mailto:/i, '');
    return { kind: 'email', term: email, complete: COMPLETE_EMAIL.test(email) };
  }

  return { kind: 'name', term: trimmed };
}

// The term to send, or null while the field holds nothing the server can match.
export function getSearchTerm(input: SearchInput): string | null {
  switch (input.kind) {
    case 'name':
      return input.term;
    case 'email':
      return input.complete ? input.term : null;
    case 'friendCode':
      return input.code;
    default:
      return null;
  }
}

// "48217730" as "4821 7730", which is easier to read out. Search accepts both.
export function formatFriendCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}
