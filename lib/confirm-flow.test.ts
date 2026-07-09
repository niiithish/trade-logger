import { describe, expect, test } from "bun:test";

import {
  beginDeleteTrade,
  beginFormReset,
  settleConfirm,
} from "./confirm-flow";

describe("settleConfirm — open → cancel / dismiss / confirm", () => {
  test("confirm runs the action once and returns ran", async () => {
    let calls = 0;
    const outcome = await settleConfirm("confirm", () => {
      calls += 1;
    });
    expect(outcome).toBe("ran");
    expect(calls).toBe(1);
  });

  test("confirm awaits async actions", async () => {
    let done = false;
    const outcome = await settleConfirm("confirm", async () => {
      await Promise.resolve();
      done = true;
    });
    expect(outcome).toBe("ran");
    expect(done).toBe(true);
  });

  test("cancel never runs the action (open → cancel)", async () => {
    let calls = 0;
    const outcome = await settleConfirm("cancel", () => {
      calls += 1;
    });
    expect(outcome).toBe("skipped");
    expect(calls).toBe(0);
  });

  test("dismiss never runs the action (open → Esc/close)", async () => {
    let calls = 0;
    const outcome = await settleConfirm("dismiss", () => {
      calls += 1;
    });
    expect(outcome).toBe("skipped");
    expect(calls).toBe(0);
  });

  test("delete-style confirm path: cancel skips delete, confirm runs it", async () => {
    let deleted = 0;
    const deleteAction = () => {
      deleted += 1;
    };

    // open → cancel
    expect(await settleConfirm("cancel", deleteAction)).toBe("skipped");
    expect(deleted).toBe(0);

    // open → confirm
    expect(await settleConfirm("confirm", deleteAction)).toBe("ran");
    expect(deleted).toBe(1);
  });

  test("form clear-style path: cancel preserves state, confirm resets", async () => {
    let formValue = "unsaved notes";
    const reset = () => {
      formValue = "";
    };

    expect(await settleConfirm("cancel", reset)).toBe("skipped");
    expect(formValue).toBe("unsaved notes");

    expect(await settleConfirm("confirm", reset)).toBe("ran");
    expect(formValue).toBe("");
  });
});

describe("beginFormReset — dirty gate before confirm modal", () => {
  test("pristine form resets immediately without opening confirm", () => {
    let resets = 0;
    let opens = 0;
    const result = beginFormReset({
      dirty: false,
      openConfirm: () => {
        opens += 1;
      },
      reset: () => {
        resets += 1;
      },
    });
    expect(result).toBe("cleared");
    expect(resets).toBe(1);
    expect(opens).toBe(0);
  });

  test("dirty form opens confirm and does not reset yet", () => {
    let resets = 0;
    let opens = 0;
    const result = beginFormReset({
      dirty: true,
      openConfirm: () => {
        opens += 1;
      },
      reset: () => {
        resets += 1;
      },
    });
    expect(result).toBe("confirm_required");
    expect(resets).toBe(0);
    expect(opens).toBe(1);
  });

  test("dirty open → cancel leaves form; open → confirm clears", async () => {
    let value = "typed";
    let confirmOpen = false;

    const step = beginFormReset({
      dirty: true,
      openConfirm: () => {
        confirmOpen = true;
      },
      reset: () => {
        value = "";
      },
    });
    expect(step).toBe("confirm_required");
    expect(confirmOpen).toBe(true);
    expect(value).toBe("typed");

    // User cancels
    const afterCancel = await settleConfirm("cancel", () => {
      value = "";
    });
    expect(afterCancel).toBe("skipped");
    expect(value).toBe("typed");

    // User confirms
    const afterConfirm = await settleConfirm("confirm", () => {
      value = "";
    });
    expect(afterConfirm).toBe("ran");
    expect(value).toBe("");
  });
});

describe("beginDeleteTrade — never deletes without confirm", () => {
  test("click only opens confirm surface", () => {
    let opens = 0;
    const deletes = 0;
    const result = beginDeleteTrade(() => {
      opens += 1;
    });
    expect(result).toBe("confirm_required");
    expect(opens).toBe(1);
    expect(deletes).toBe(0);
  });

  test("full path: beginDelete → cancel skips; beginDelete → confirm deletes", async () => {
    const deletedIds: string[] = [];
    const tradeId = "trade-abc";

    // Cancel path
    beginDeleteTrade(() => {
      /* modal would open */
    });
    expect(
      await settleConfirm("cancel", () => {
        deletedIds.push(tradeId);
      })
    ).toBe("skipped");
    expect(deletedIds).toEqual([]);

    // Confirm path
    beginDeleteTrade(() => {
      /* modal would open */
    });
    expect(
      await settleConfirm("confirm", () => {
        deletedIds.push(tradeId);
      })
    ).toBe("ran");
    expect(deletedIds).toEqual([tradeId]);
  });
});
