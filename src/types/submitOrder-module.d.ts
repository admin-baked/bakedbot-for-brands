
// src/types/submitOrder-module.d.ts

declare module '@/app/checkout/actions/submitOrder' {
  // Make these loose on purpose so they don't fight you
  export type ClientOrderInput = {
    [key: string]: any;
  };

  export type ServerOrderPayload = {
    [key: string]: any;
  };

  export function submitOrder(
    input: ClientOrderInput
  ): Promise<{ ok: boolean; orderId?: string; userId?: string; error?: string }>;
}
