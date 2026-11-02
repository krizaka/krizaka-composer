import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { isEscapeOutsideTextEntry, stopActivationKey } from "../keyboard";
import { Modal } from "../../components/Modal";
import { ActionBar } from "../../components/ActionBar";
import { MenuItem } from "../../components/Puck/components/Nav";

jest.mock("../../components/Modal/styles.module.css");
jest.mock("../../components/ActionBar/styles.module.css");
jest.mock("../../components/Puck/components/Nav/styles.module.css");

// Sonar S1082, S6819, S6845: containers answer the keyboard without a role,
// controls are native elements.
describe("keyboard", () => {
  it("activation keys stop at the container, other keys bubble", () => {
    const parent = jest.fn();
    render(
      <div onKeyDown={parent}>
        <ActionBar>
          <button>Act</button>
        </ActionBar>
      </div>
    );
    const button = screen.getByText("Act");

    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(parent).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: "z", ctrlKey: true });
    expect(parent).toHaveBeenCalledTimes(1);
  });

  it("stopActivationKey stops only Enter and Space", () => {
    const stop = jest.fn();
    stopActivationKey({ key: "Enter", stopPropagation: stop } as any);
    stopActivationKey({ key: "Tab", stopPropagation: stop } as any);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("Escape counts outside text entry only", () => {
    const input = document.createElement("input");
    const div = document.createElement("div");
    expect(
      isEscapeOutsideTextEntry({ key: "Escape", target: div } as any)
    ).toBe(true);
    expect(
      isEscapeOutsideTextEntry({ key: "Escape", target: input } as any)
    ).toBe(false);
    expect(isEscapeOutsideTextEntry({ key: "a", target: div } as any)).toBe(
      false
    );
  });

  it("Modal closes on Escape, as on a click on the backdrop", () => {
    const onClose = jest.fn();
    const root = document.createElement("div");
    root.id = "puck-portal-root";
    document.body.appendChild(root);
    render(
      <Modal onClose={onClose} isOpen>
        <button>Inside</button>
      </Modal>
    );
    const inside = screen.getByText("Inside");
    fireEvent.keyDown(inside, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(inside);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(root.firstElementChild as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
    root.remove();
  });

  it("a menu item is a native button", () => {
    const onClick = jest.fn();
    render(
      <ul>
        <MenuItem label="Blocks" onClick={onClick} />
      </ul>
    );
    const button = screen.getByRole("button", { name: "Blocks" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).not.toHaveAttribute("tabindex");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
