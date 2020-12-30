import { CstNode, CstParser, IRecognitionException } from 'chevrotain'
import { allTokens, Tokens } from './lexer'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'

export class Parser extends CstParser {
  static INSTANCE = new Parser()

  static BaseCstVisitorConstructor = Parser.INSTANCE.getBaseCstVisitorConstructor()
  static BaseCstVisitorConstructorWithDefaults = Parser.INSTANCE.getBaseCstVisitorConstructorWithDefaults()

  /// Declare declarations created by the parser.
  private declare namespaceExpression: () => CstNode
  private declare classDeclaration: () => CstNode
  private declare decoratorExpression: () => CstNode
  private declare callExpression: () => CstNode
  private declare structExpression: () => CstNode
  private declare tupleExpression: () => CstNode
  private declare kvPair: () => CstNode

  private constructor() {
    super(allTokens)

    const $ = this

    $.RULE('namespaceExpression', () => {
      $.CONSUME(Tokens.Namespace)
      $.CONSUME(Tokens.Identifier)
      $.CONSUME(Tokens.LeftBracket)
      $.MANY(() => $.SUBRULE($.classDeclaration))
      $.CONSUME(Tokens.RightBracket)
    })

    $.RULE('classDeclaration', () => {
      $.OPTION(() => $.SUBRULE($.decoratorExpression))
      $.CONSUME(Tokens.Identifier)
      $.OPTION2(() => $.SUBRULE($.tupleExpression))
      $.OPTION3(() => $.SUBRULE($.structExpression))
    })

    $.RULE('decoratorExpression', () => {
      $.CONSUME(Tokens.At)
      $.CONSUME(Tokens.Identifier)
      $.OPTION(() => $.SUBRULE($.callExpression))
    })

    $.RULE('callExpression', () => {
      $.OPTION(() => {
        $.CONSUME(Tokens.LeftParen)
        $.OPTION2(() =>
          $.OR([
            { ALT: () => $.CONSUME(Tokens.StringLiteral) },
            { ALT: () => $.CONSUME2(Tokens.Identifier) },
          ]),
        )
        $.CONSUME(Tokens.RightParen)
      })
    })

    $.RULE('structExpression', () => {
      $.CONSUME(Tokens.LeftBracket)
      $.MANY_SEP({
        SEP: Tokens.Comma,
        DEF: () => $.SUBRULE($.kvPair),
      })
      $.CONSUME(Tokens.RightBracket)
    })

    $.RULE('tupleExpression', () => {
      $.CONSUME(Tokens.LeftParen)
      $.MANY_SEP({
        SEP: Tokens.Comma,
        DEF: () => {
          $.OPTION(() => $.SUBRULE($.decoratorExpression))
          $.CONSUME(Tokens.Identifier)
        },
      })
      $.CONSUME(Tokens.RightParen)
    })

    $.RULE('kvPair', () => {
      $.CONSUME(Tokens.Identifier)
      $.CONSUME(Tokens.Colon)
      $.CONSUME2(Tokens.Identifier)
    })

    this.performSelfAnalysis()
  }

  public parseCST(): E.Either<IRecognitionException[], CstNode> {
    return pipe(
      // Expressions are nullable but we declare them as nullable to satisfy
      // chevrotain API.
      O.fromNullable(this.namespaceExpression()),
      E.fromOption(() => [...this.errors]),
    )
  }
}

export const parser = Parser.INSTANCE
