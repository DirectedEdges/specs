// A step stopping deliberately (ADR-101).
//
// Its own module, importing nothing: the commands throw this, and the chain
// imports the commands. Putting it beside the step types would make every
// command depend on the workspace types those describe, and a cycle that wide
// quietly costs type inference inside the commands themselves.
export class StepError extends Error {
  constructor(
    message: string,
    /** The exit code `specs <command>` would have used on its own. */
    readonly code = 1,
    readonly tip?: string,
    /**
     * The step already printed its own explanation. Set by commands whose
     * messages were written for a person reading one command's output — the
     * chain must not print a second, worse version of what is already there.
     */
    readonly reported = false,
  ) {
    super(message);
    this.name = 'StepError';
  }
}
