import React from "react";

export const Separator = ({ text }: { text: string }) => {
  return (
    <div className="gh-separator">
      <div className="gh-separator-line" />
      <span className="gh-separator-text">{text}</span>
      <div className="gh-separator-line" />
    </div>
  );
};
