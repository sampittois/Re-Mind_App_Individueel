import React from "react";

export default function PencilIcon({ className = "", title = "" }) {
  return (
    <svg
      className={className}
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? "false" : "true"}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M15.302 4.97774L21.0229 10.6984M1 25L7.9381 23.6021C8.30643 23.5279 8.64462 23.3465 8.91022 23.0808L24.4418 7.5412C25.1865 6.79615 25.186 5.58848 24.4407 4.84406L21.1506 1.55775C20.4056 0.813641 19.1985 0.814148 18.4541 1.55888L2.92088 17.1001C2.65579 17.3653 2.47478 17.7028 2.4005 18.0703L1 25Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
