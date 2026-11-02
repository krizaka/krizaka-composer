import { ReactNode, useEffect, useState } from "react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import { stopActivationKey } from "../../lib/keyboard";
import styles from "./styles.module.css";
import { createPortal } from "react-dom";

const getClassName = getClassNameFactory("Modal", styles);

export const Modal = ({
  children,
  onClose,
  isOpen,
}: {
  children: ReactNode;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const [rootEl, setRootEl] = useState<any>(null);

  useEffect(() => {
    setRootEl(document.getElementById("puck-portal-root"));
  }, []);

  if (!rootEl) {
    return <div />;
  }

  return createPortal(
    <div
      className={getClassName({ isOpen })}
      onClick={(e) => {
        // A click on the backdrop closes; a click inside stops here (the
        // portal would otherwise bubble it to the React parents).
        if (e.target === e.currentTarget) {
          onClose();
        } else {
          e.stopPropagation();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        } else {
          stopActivationKey(e);
        }
      }}
    >
      <div className={getClassName("inner")}>{children}</div>
    </div>,
    rootEl
  );
};
