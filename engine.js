// One deterministic transition engine drives every visualization.
(function (root) {
  'use strict';
  const BLANK = '□';
  const machines = typeof module !== 'undefined' && module.exports ? require('./recipes.js') : root.TuringRecipes;

  class Machine {
    constructor(definition, input) {
      const error = definition.validate(input);
      if (error) throw new Error(error);
      if (input.length > 64) throw new Error('Use at most 64 input symbols.');
      this.definition = definition;
      this.input = input;
      this.tape = new Map([...input].map((s, i) => [i, s]));
      this.head = 0;
      this.state = definition.start;
      this.steps = 0;
      this.history = [];
      this.halted = false;
      this.outcome = null;
      this.minVisited = 0;
      this.maxVisited = 0;
      this.ruleMap = new Map();
      for (const r of definition.rules) {
        const key = r.state + ':' + r.read;
        if (this.ruleMap.has(key)) throw new Error('Duplicate transition: ' + key);
        this.ruleMap.set(key, r);
      }
      this.checkHalt();
    }
    read(position = this.head) { return this.tape.get(position) ?? BLANK; }
    nextRule() { return this.halted ? null : this.ruleMap.get(this.state + ':' + this.read()) ?? null; }
    checkHalt() {
      if (this.definition.accept.includes(this.state)) { this.halted = true; this.outcome = 'accept'; }
      else if (this.definition.reject.includes(this.state)) { this.halted = true; this.outcome = 'reject'; }
    }
    step() {
      if (this.halted) return null;
      const r = this.nextRule();
      const event = { step: this.steps + 1, state: this.state, head: this.head, read: this.read(), rule: r,
        minVisited: this.minVisited, maxVisited: this.maxVisited, halted: this.halted, outcome: this.outcome };
      // Missing rules halt without pretending a transition occurred.
      if (!r) { this.history.push(event); this.halted = true; this.outcome = 'stuck'; return event; }
      if (r.write === BLANK) this.tape.delete(this.head); else this.tape.set(this.head, r.write);
      this.head += r.move === 'L' ? -1 : r.move === 'R' ? 1 : 0;
      this.state = r.next;
      this.steps++;
      this.minVisited = Math.min(this.minVisited, this.head);
      this.maxVisited = Math.max(this.maxVisited, this.head);
      this.history.push(event);
      this.checkHalt();
      return event;
    }
    back() {
      const e = this.history.pop();
      if (!e) return false;
      if (e.rule) {
        if (e.read === BLANK) this.tape.delete(e.head); else this.tape.set(e.head, e.read);
        this.steps--;
      }
      this.head = e.head; this.state = e.state;
      this.minVisited = e.minVisited; this.maxVisited = e.maxVisited;
      this.halted = e.halted; this.outcome = e.outcome;
      return true;
    }
    output() {
      if (!this.tape.size) return '';
      const positions = [...this.tape.keys()];
      let value = '';
      for (let i = Math.min(...positions); i <= Math.max(...positions); i++) value += this.read(i);
      return value;
    }
  }
  const api = { BLANK, machines, Machine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Turing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
