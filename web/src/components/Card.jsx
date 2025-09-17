import React from "react";

export default function Card({
  title,
  children,
  footer,
  actions,
  className = "",
  bodyClassName = "",
  style,
  bodyStyle,
  titleClassName = "",
}) {
  return (
    <section className={`card ${className}`} style={style}>
      <div className="card-header">
        {title && <h3 className={`card-title ${titleClassName}`}>{title}</h3>}
        {actions}
      </div>
      <div className={`card-body ${bodyClassName}`} style={bodyStyle}>
        {children}
      </div>
      {footer && <div className="card-footer">{footer}</div>}
    </section>
  );
}
