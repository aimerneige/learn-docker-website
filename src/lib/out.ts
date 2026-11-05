/** A generated line plus the option it belongs to, so hovering an option can highlight its lines. */
export interface Line {
  text: string;
  tag?: string;
}

export class Out {
  lines: Line[] = [];
  constructor(public comments: boolean) {}

  line(text: string, tag?: string) {
    this.lines.push({ text, tag });
    return this;
  }
  /** Full-line comment, emitted only when comments are enabled. */
  comment(text: string, indent: number, tag?: string, prefix = '#') {
    if (this.comments) this.line(`${' '.repeat(indent)}${prefix} ${text}`, tag);
    return this;
  }
  /** Inline trailing comment (or empty string). */
  ic(text: string) {
    return this.comments ? `  # ${text}` : '';
  }
  blank() {
    const last = this.lines[this.lines.length - 1];
    if (last && last.text !== '') this.line('');
    return this;
  }
  done(): Line[] {
    while (this.lines.length && this.lines[this.lines.length - 1].text === '') this.lines.pop();
    return this.lines;
  }
}
