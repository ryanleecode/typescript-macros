import { createToken, ILexingError, IToken, Lexer } from 'chevrotain'
import * as E from 'fp-ts/lib/Either'
// -------------------------------------------------------------------------------------
// tokens
// -------------------------------------------------------------------------------------

const At = createToken({ name: 'At', pattern: /@/ })

const LeftBracket = createToken({ name: 'LeftBracket', pattern: /{/ })
const RightBracket = createToken({ name: 'RightBracket', pattern: /}/ })

const LeftParen = createToken({ name: 'LeftParen', pattern: /\(/ })
const RightParen = createToken({ name: 'RightParen', pattern: /\)/ })

const Apostrophe = createToken({ name: 'Apostrophe', pattern: /'/ })
const QuoteMark = createToken({ name: 'QuoteMark', pattern: /"/ })

const Comma = createToken({ name: 'Comma', pattern: /,/ })

const Colon = createToken({ name: 'Colon', pattern: /:/ })

const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

const Num = createToken({ name: 'Number', pattern: /[0-9]+/ })

const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /\"([^\\\"]|\\.)*\"/,
})

const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z]\w*/ })

// -------------------------------------------------------------------------------------
// keywords
// -------------------------------------------------------------------------------------

const Namespace = createToken({
  name: 'Namespace',
  pattern: /namespace/,
  longer_alt: Identifier,
})

// -------------------------------------------------------------------------------------
// Lexer
// -------------------------------------------------------------------------------------

export const Tokens = {
  WhiteSpace,
  StringLiteral,
  At,
  LeftBracket,
  RightBracket,
  LeftParen,
  RightParen,
  Apostrophe,
  QuoteMark,
  Comma,
  Colon,
  Num,
  Namespace,
  Identifier,
} as const

export const allTokens = Object.values(Tokens)

const lexer = new Lexer(allTokens, {
  deferDefinitionErrorsHandling: true,
})

export interface LexingOutput {
  tokens: IToken[]
  groups: {
    [groupName: string]: IToken[]
  }
}

export function tokenize(
  text: string,
  initialMode?: string,
): E.Either<ILexingError[], LexingOutput> {
  const lexerResult = lexer.tokenize(text, initialMode)
  if (lexerResult.errors.length > 0) {
    return E.left(lexerResult.errors)
  }

  return E.right({
    tokens: lexerResult.tokens,
    groups: lexerResult.groups,
  })
}
