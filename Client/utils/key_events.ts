export default function key_handlers(
  handlers: Record<string, (event: KeyboardEvent) => void>
) {
  return (event: KeyboardEvent) => {
    const handler = handlers[event.key];
    if (!handler) return;

    event.preventDefault();
    event.stopPropagation();
    handler(event);
  };
}
