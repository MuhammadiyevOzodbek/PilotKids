import type {
  BinaryOp,
  CodeError,
  Expression,
  ParsedSketch,
  ParseResult,
  Statement,
} from "./types";

/**
 * Arduino eskizining xavfsiz parseri.
 *
 * `eval()` yoki `new Function()` ISHLATILMAYDI — foydalanuvchi kodi hech
 * qachon JavaScript sifatida bajarilmaydi. Bu yerda kod tokenlarga bo'linadi
 * va faqat ruxsat etilgan sintaksisdan iborat daraxt (AST) quriladi.
 * Simulyator o'sha daraxtni o'zi qadam-baqadam bajaradi.
 *
 * Qo'llab-quvvatlanadigan qism:
 *   • `void setup()` va `void loop()` bloklari
 *   • `int/long/float/bool/byte` e'lonlari, `const` bilan ham
 *   • qiymat berish, `if/else`, `while`, `for`
 *   • funksiya chaqiruvlari va arifmetik/mantiqiy ifodalar
 */

/* ─────────────────────────── Tokenizer ─────────────────────────── */

type TokenType = "number" | "string" | "identifier" | "punct" | "eof";

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/** Uzunroq operatorlar oldin turishi shart — `==` `=` dan avval tekshiriladi. */
const OPERATORS = [
  "==",
  "!=",
  "<=",
  ">=",
  "<<=",
  ">>=",
  "<<",
  ">>",
  "&&",
  "||",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "&",
  "|",
  "^",
  "<",
  ">",
  "=",
  "!",
  "~",
  "(",
  ")",
  "{",
  "}",
  ",",
  ";",
  ".",
  "#",
];

class Tokenizer {
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(private readonly src: string) {}

  private error(message: string, hint: string): never {
    const err: CodeError = { line: this.line, column: this.col, message, hint };
    throw new ParseFailure([err]);
  }

  private advance(n = 1) {
    for (let i = 0; i < n; i++) {
      if (this.src[this.pos] === "\n") {
        this.line += 1;
        this.col = 1;
      } else {
        this.col += 1;
      }
      this.pos += 1;
    }
  }

  /** Bo'sh joy va izohlarni o'tkazib yuboradi. */
  private skipTrivia() {
    for (;;) {
      const ch = this.src[this.pos];
      if (ch === undefined) return;

      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.advance();
        continue;
      }
      if (ch === "/" && this.src[this.pos + 1] === "/") {
        while (this.pos < this.src.length && this.src[this.pos] !== "\n") this.advance();
        continue;
      }
      if (ch === "/" && this.src[this.pos + 1] === "*") {
        this.advance(2);
        for (;;) {
          if (this.pos >= this.src.length) {
            this.error("Izoh yopilmagan", "`/*` ochilgan, lekin `*/` qo'yilmagan.");
          }
          if (this.src[this.pos] === "*" && this.src[this.pos + 1] === "/") {
            this.advance(2);
            break;
          }
          this.advance();
        }
        continue;
      }
      return;
    }
  }

  tokenize(): Token[] {
    const out: Token[] = [];

    for (;;) {
      this.skipTrivia();
      if (this.pos >= this.src.length) break;

      const line = this.line;
      const column = this.col;
      const ch = this.src[this.pos]!;

      // Raqam
      if (/[0-9]/.test(ch)) {
        if (ch === "0" && /[xX]/.test(this.src[this.pos + 1] ?? "")) {
          this.advance(2);
          let raw = "";
          while (this.pos < this.src.length && /[0-9A-Fa-f_]/.test(this.src[this.pos]!)) {
            raw += this.src[this.pos];
            this.advance();
          }
          if (!raw) this.error("Noto'g'ri hex son", "`0x` dan keyin hex raqam yozing.");
          out.push({
            type: "number",
            value: String(parseInt(raw.replace(/_/g, ""), 16)),
            line,
            column,
          });
          continue;
        }

        if (ch === "0" && /[bB]/.test(this.src[this.pos + 1] ?? "")) {
          this.advance(2);
          let raw = "";
          while (this.pos < this.src.length && /[01_]/.test(this.src[this.pos]!)) {
            raw += this.src[this.pos];
            this.advance();
          }
          if (!raw) this.error("Noto'g'ri binary son", "`0b` dan keyin 0 yoki 1 yozing.");
          out.push({
            type: "number",
            value: String(parseInt(raw.replace(/_/g, ""), 2)),
            line,
            column,
          });
          continue;
        }

        let raw = "";
        while (this.pos < this.src.length && /[0-9._]/.test(this.src[this.pos]!)) {
          raw += this.src[this.pos];
          this.advance();
        }
        out.push({ type: "number", value: raw.replace(/_/g, ""), line, column });
        continue;
      }

      // Satr
      if (ch === '"') {
        this.advance();
        let raw = "";
        for (;;) {
          const c = this.src[this.pos];
          if (c === undefined || c === "\n") {
            this.error("Qo'shtirnoq yopilmagan", 'Matnni `"` bilan yoping.');
          }
          if (c === "\\") {
            const next = this.src[this.pos + 1];
            raw += next === "n" ? "\n" : next === "t" ? "\t" : (next ?? "");
            this.advance(2);
            continue;
          }
          if (c === '"') {
            this.advance();
            break;
          }
          raw += c;
          this.advance();
        }
        out.push({ type: "string", value: raw, line, column });
        continue;
      }

      // Bitta belgi: Arduino'da `'A'` char kodi sifatida ishlatiladi.
      if (ch === "'") {
        this.advance();
        const c = this.src[this.pos];
        if (c === undefined || c === "\n") {
          this.error("Belgili literal yopilmagan", "Belgini `'` bilan yoping, masalan `'A'`.");
        }

        let value: string;
        if (c === "\\") {
          const next = this.src[this.pos + 1];
          value = next === "n" ? "\n" : next === "t" ? "\t" : (next ?? "");
          this.advance(2);
        } else {
          value = c;
          this.advance();
        }

        if (this.src[this.pos] !== "'") {
          this.error("Belgili literal juda uzun", "Bitta belgi yozing, masalan `'1'` yoki `'A'`.");
        }
        this.advance();
        out.push({ type: "number", value: String(value.charCodeAt(0)), line, column });
        continue;
      }

      // Identifikator / kalit so'z
      if (/[A-Za-z_]/.test(ch)) {
        let raw = "";
        while (this.pos < this.src.length && /[A-Za-z0-9_]/.test(this.src[this.pos]!)) {
          raw += this.src[this.pos];
          this.advance();
        }
        out.push({ type: "identifier", value: raw, line, column });
        continue;
      }

      // Operator / tinish belgisi
      const op = OPERATORS.find((o) => this.src.startsWith(o, this.pos));
      if (op) {
        this.advance(op.length);
        out.push({ type: "punct", value: op, line, column });
        continue;
      }

      this.error(`Tushunarsiz belgi: "${ch}"`, "Bu belgi Arduino kodida ishlatilmaydi.");
    }

    out.push({ type: "eof", value: "", line: this.line, column: this.col });
    return out;
  }
}

/* ─────────────────────────── Parser ─────────────────────────── */

class ParseFailure extends Error {
  constructor(readonly errors: CodeError[]) {
    super(errors[0]?.message ?? "Parse xatosi");
    this.name = "ParseFailure";
  }
}

const TYPE_KEYWORDS = new Set([
  "int",
  "long",
  "float",
  "double",
  "bool",
  "boolean",
  "byte",
  "char",
  "unsigned",
  "void",
  "String",
  "Servo",
]);

/** Ifoda operatorlarining ustuvorligi (katta raqam — kuchliroq bog'lanadi). */
const PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "|": 3,
  "^": 4,
  "&": 5,
  "==": 6,
  "!=": 6,
  "<": 7,
  ">": 7,
  "<=": 7,
  ">=": 7,
  "<<": 8,
  ">>": 8,
  "+": 9,
  "-": 9,
  "*": 10,
  "/": 10,
  "%": 10,
};

class Parser {
  private i = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)]!;
  }

  private next(): Token {
    const t = this.peek();
    if (t.type !== "eof") this.i += 1;
    return t;
  }

  private fail(token: Token, message: string, hint: string): never {
    throw new ParseFailure([{ line: token.line, column: token.column, message, hint }]);
  }

  private expect(value: string, hint: string): Token {
    const t = this.peek();
    if (t.value !== value) {
      this.fail(t, `"${value}" kutilgan edi, "${t.value || "fayl oxiri"}" topildi`, hint);
    }
    return this.next();
  }

  private at(value: string): boolean {
    return this.peek().value === value;
  }

  private asStatements(value: Statement | Statement[]): Statement[] {
    return Array.isArray(value) ? value : [value];
  }

  private expectSingleStatement(
    value: Statement | Statement[],
    message: string,
    hint: string,
  ): Statement {
    if (Array.isArray(value)) this.fail(this.peek(), message, hint);
    return value;
  }

  /* ── Ifodalar ── */

  private parsePrimary(): Expression {
    const t = this.next();

    if (t.type === "number") {
      const value = Number(t.value);
      if (!Number.isFinite(value)) {
        this.fail(t, `Noto'g'ri son: "${t.value}"`, "Sonni to'g'ri yozing, masalan 100.");
      }
      return { kind: "number", value };
    }

    if (t.type === "string") return { kind: "string", value: t.value };

    if (t.value === "(") {
      const inner = this.parseExpression();
      this.expect(")", "Ochilgan `(` uchun `)` qo'ying.");
      return inner;
    }

    if (t.value === "-" || t.value === "!" || t.value === "~") {
      return { kind: "unary", op: t.value, operand: this.parsePrimary() };
    }

    if (t.type === "identifier") {
      // `Serial.println(...)` — nuqtali chaqiruv bitta nom sifatida yig'iladi.
      let name = t.value;
      while (this.at(".")) {
        this.next();
        const member = this.next();
        if (member.type !== "identifier") {
          this.fail(member, "Nuqtadan keyin nom kutilgan", "Masalan: `Serial.println`.");
        }
        name += `.${member.value}`;
      }

      if (this.at("(")) {
        this.next();
        const args: Expression[] = [];
        if (!this.at(")")) {
          for (;;) {
            args.push(this.parseExpression());
            if (this.at(",")) {
              this.next();
              continue;
            }
            break;
          }
        }
        this.expect(")", `\`${name}(\` uchun yopuvchi \`)\` qo'ying.`);
        return { kind: "call", callee: name, args };
      }

      return { kind: "identifier", name };
    }

    this.fail(t, `Kutilmagan belgi: "${t.value}"`, "Bu yerda son, nom yoki ifoda bo'lishi kerak.");
  }

  private parseBinary(minPrec: number): Expression {
    let left = this.parsePrimary();

    for (;;) {
      const t = this.peek();
      const prec = PRECEDENCE[t.value];
      if (t.type !== "punct" || prec === undefined || prec < minPrec) break;
      this.next();
      const right = this.parseBinary(prec + 1);
      left = { kind: "binary", op: t.value as BinaryOp, left, right };
    }

    return left;
  }

  private parseExpression(): Expression {
    return this.parseBinary(1);
  }

  /* ── Buyruqlar ── */

  private parseBlock(): Statement[] {
    this.expect("{", "Blok `{` bilan boshlanishi kerak.");
    const out: Statement[] = [];
    while (!this.at("}")) {
      if (this.peek().type === "eof") {
        this.fail(this.peek(), "Blok yopilmagan", "Ochilgan `{` uchun `}` qo'ying.");
      }
      out.push(...this.asStatements(this.parseStatement()));
    }
    this.expect("}", "Blokni `}` bilan yoping.");
    return out;
  }

  /** `{ ... }` yoki bitta buyruq (qavssiz `if`). */
  private parseBody(): Statement[] {
    return this.at("{") ? this.parseBlock() : this.asStatements(this.parseStatement());
  }

  private parseStatement(): Statement | Statement[] {
    const t = this.peek();
    const line = t.line;

    if (t.value === ";") {
      this.next();
      return { kind: "expression", expression: { kind: "number", value: 0 }, line };
    }

    if (t.value === "return") {
      this.next();
      const value = this.at(";") ? null : this.parseExpression();
      this.expect(";", "`return` buyrug'i oxiriga `;` qo'ying.");
      return { kind: "return", value, line };
    }

    if (t.value === "break" || t.value === "continue") {
      this.next();
      this.expect(";", `\`${t.value}\` buyrug'i oxiriga \`;\` qo'ying.`);
      return { kind: t.value, line };
    }

    if (t.value === "if") {
      this.next();
      this.expect("(", "`if` dan keyin `(` qo'ying.");
      const test = this.parseExpression();
      this.expect(")", "`if` shartini `)` bilan yoping.");
      const then = this.parseBody();
      let otherwise: Statement[] = [];
      if (this.at("else")) {
        this.next();
        otherwise = this.at("if") ? this.asStatements(this.parseStatement()) : this.parseBody();
      }
      return { kind: "if", test, then, else: otherwise, line };
    }

    if (t.value === "while") {
      this.next();
      this.expect("(", "`while` dan keyin `(` qo'ying.");
      const test = this.parseExpression();
      this.expect(")", "`while` shartini `)` bilan yoping.");
      return { kind: "while", test, body: this.parseBody(), line };
    }

    if (t.value === "for") {
      this.next();
      this.expect("(", "`for` dan keyin `(` qo'ying.");
      const init = this.at(";")
        ? null
        : this.expectSingleStatement(
            this.parseSimpleStatement(),
            "`for` sarlavhasida bitta boshlang'ich buyruq yozing",
            "Masalan: `for (int i = 0; i < 10; i++)`.",
          );
      this.expect(";", "`for` ning birinchi qismidan keyin `;` qo'ying.");
      const test = this.at(";") ? null : this.parseExpression();
      this.expect(";", "`for` ning shartidan keyin `;` qo'ying.");
      const update = this.at(")")
        ? null
        : this.expectSingleStatement(
            this.parseSimpleStatement(),
            "`for` yangilash qismida bitta buyruq yozing",
            "Masalan: `i++` yoki `i += 1`.",
          );
      this.expect(")", "`for` sarlavhasini `)` bilan yoping.");
      return { kind: "for", init, test, update, body: this.parseBody(), line };
    }

    const stmt = this.parseSimpleStatement();
    this.expect(";", "Buyruq oxiriga `;` qo'ying.");
    return stmt;
  }

  /** `;` siz buyruq — e'lon, qiymat berish yoki ifoda. */
  private parseSimpleStatement(): Statement | Statement[] {
    const t = this.peek();
    const line = t.line;

    if ((t.value === "++" || t.value === "--") && this.peek(1).type === "identifier") {
      const op = this.next().value;
      const name = this.next().value;
      return {
        kind: "assign",
        name,
        value: {
          kind: "binary",
          op: op === "++" ? "+" : "-",
          left: { kind: "identifier", name },
          right: { kind: "number", value: 1 },
        },
        line,
      };
    }

    // E'lon: [const] <tur> <nom> [= ifoda]
    let offset = 0;
    if (this.peek(offset).value === "const") offset += 1;
    if (this.peek(offset).value === "unsigned") offset += 1;

    if (
      this.peek(offset).type === "identifier" &&
      TYPE_KEYWORDS.has(this.peek(offset).value) &&
      this.peek(offset + 1).type === "identifier"
    ) {
      if (this.at("const")) this.next();
      if (this.at("unsigned")) this.next();
      const valueType = this.next().value;
      const declarations: Statement[] = [];

      for (;;) {
        const name = this.next();
        if (name.type !== "identifier") {
          this.fail(name, "O'zgaruvchi nomi kutilgan", "Masalan: `int count = 0;`.");
        }

        let value: Expression | null = null;
        if (this.at("=")) {
          this.next();
          value = this.parseExpression();
        }

        declarations.push({ kind: "declare", name: name.value, valueType, value, line });
        if (!this.at(",")) break;
        this.next();
      }

      return declarations.length === 1 ? declarations[0]! : declarations;
    }

    // Qiymat berish: nom = ifoda | nom += ifoda | nom *= ifoda | nom++
    if (this.peek().type === "identifier" && this.peek(1).type === "punct") {
      const op = this.peek(1).value;
      if (op === "=") {
        const name = this.next().value;
        this.next();
        return { kind: "assign", name, value: this.parseExpression(), line };
      }
      if (
        op === "+=" ||
        op === "-=" ||
        op === "*=" ||
        op === "/=" ||
        op === "%=" ||
        op === "&=" ||
        op === "|=" ||
        op === "^=" ||
        op === "<<=" ||
        op === ">>="
      ) {
        const name = this.next().value;
        this.next();
        const rhs = this.parseExpression();
        const binaryOp = op.slice(0, -1) as BinaryOp;
        return {
          kind: "assign",
          name,
          value: {
            kind: "binary",
            op: binaryOp,
            left: { kind: "identifier", name },
            right: rhs,
          },
          line,
        };
      }
      if (op === "++" || op === "--") {
        const name = this.next().value;
        this.next();
        return {
          kind: "assign",
          name,
          value: {
            kind: "binary",
            op: op === "++" ? "+" : "-",
            left: { kind: "identifier", name },
            right: { kind: "number", value: 1 },
          },
          line,
        };
      }
    }

    return { kind: "expression", expression: this.parseExpression(), line };
  }

  /* ── Yuqori daraja ── */

  parseSketch(): ParsedSketch {
    const defines: Record<string, number | string> = {};
    const globals: Statement[] = [];
    const functions: ParsedSketch["functions"] = {};
    let setup: Statement[] | null = null;
    let loop: Statement[] | null = null;

    while (this.peek().type !== "eof") {
      const t = this.peek();

      if (t.value === "#") {
        this.next();
        const directive = this.next();
        if (directive.value === "define") {
          const name = this.next();
          const value = this.next();
          if (name.type === "identifier") {
            if (value.type === "number") defines[name.value] = Number(value.value);
            else if (value.type === "string") defines[name.value] = value.value;
            else if (value.type === "identifier") defines[name.value] = value.value;
          }
        }
        while (this.peek().type !== "eof" && this.peek().line === t.line) this.next();
        continue;
      }

      // Funksiya: <tur> <nom>() { ... }
      const isFn =
        t.type === "identifier" &&
        TYPE_KEYWORDS.has(t.value) &&
        this.peek(1).type === "identifier" &&
        this.peek(2).value === "(";

      if (isFn) {
        this.next(); // tur
        const name = this.next().value;
        this.expect("(", "Funksiya nomidan keyin `(` kutilgan.");
        const params: string[] = [];
        if (!this.at(")")) {
          for (;;) {
            if (this.at("const")) this.next();
            if (this.at("unsigned")) this.next();
            const paramType = this.next();
            if (
              paramType.type !== "identifier" ||
              !TYPE_KEYWORDS.has(paramType.value) ||
              paramType.value === "void"
            ) {
              this.fail(
                paramType,
                "Funksiya parametri turi noto'g'ri",
                "Masalan: `void blink(int pin)`.",
              );
            }
            const paramName = this.next();
            if (paramName.type !== "identifier") {
              this.fail(
                paramName,
                "Funksiya parametri nomi kutilgan",
                "Masalan: `void blink(int pin)`.",
              );
            }
            params.push(paramName.value);
            if (!this.at(",")) break;
            this.next();
          }
        }
        this.expect(")", "Funksiya qavsini `)` bilan yoping.");
        const body = this.parseBlock();

        if (name === "setup") setup = body;
        else if (name === "loop") loop = body;
        else functions[name] = { params, body };
        continue;
      }

      globals.push(...this.asStatements(this.parseStatement()));
    }

    if (!setup) {
      throw new ParseFailure([
        {
          line: 1,
          column: 1,
          message: "`void setup()` funksiyasi topilmadi",
          hint: "Har bir Arduino kodida `void setup() { }` bo'lishi shart.",
        },
      ]);
    }
    if (!loop) {
      throw new ParseFailure([
        {
          line: 1,
          column: 1,
          message: "`void loop()` funksiyasi topilmadi",
          hint: "Har bir Arduino kodida `void loop() { }` bo'lishi shart.",
        },
      ]);
    }

    return { defines, globals, setup, loop, functions };
  }
}

/* ─────────────────────────── Ommaviy API ─────────────────────────── */

/** Kodni tekshiradi va daraxtga aylantiradi. Xato bo'lsa `ok: false`. */
export function parseSketch(code: string): ParseResult {
  try {
    const tokens = new Tokenizer(code).tokenize();
    const sketch = new Parser(tokens).parseSketch();
    return { ok: true, sketch };
  } catch (err) {
    if (err instanceof ParseFailure) return { ok: false, errors: err.errors };
    return {
      ok: false,
      errors: [
        {
          line: 1,
          column: 1,
          message: "Kodni o'qib bo'lmadi",
          hint: "Sintaksisni tekshiring — qavslar va `;` joyidami?",
        },
      ],
    };
  }
}
