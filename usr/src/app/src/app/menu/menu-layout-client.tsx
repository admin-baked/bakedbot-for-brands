"use client";

import * as React from "react";

type MenuLayoutClientProps = {
  children: React.ReactNode;
  // allow any extra props without TS complaining
  [key: string]: any;
};

export default function MenuLayoutClient(props: MenuLayoutClientProps) {
  return <>{props.children}</>;
}
