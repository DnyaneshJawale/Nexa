import type { ReactNode } from "react";

import "./PageHeader.css";


type Props = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};


export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: Props) {
  return (
    <header className="nexa-page-header">

      <div className="nexa-page-header-main">

        <div className="nexa-page-context">

          <span className="nexa-page-context-dot" />

          <span>
            {eyebrow}
          </span>

        </div>


        <h1 className="nexa-page-title">
          {title}
        </h1>


        <p className="nexa-page-description">
          {description}
        </p>

      </div>


      {action ? (

        <div className="nexa-page-action">
          {action}
        </div>

      ) : null}

    </header>
  );
}