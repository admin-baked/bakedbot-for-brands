'use client';

export default function DevLoginButton() {
  return (
    <button
      type="button"
      className="rounded-md border px-4 py-2 text-sm"
      onClick={() => {
        // TODO: wire up real dev login behavior
        console.log('DevLoginButton clicked');
      }}
    >
      Dev Login
    </button>
  );
}
