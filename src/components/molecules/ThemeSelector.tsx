export const ThemeSelector = () => {
  return (
    <div className="flex gap-2">
      <input
        type="radio"
        name="theme-buttons"
        className="theme-controller btn btn-sm"
        aria-label="Light"
        value="light"
      />
      <input
        type="radio"
        name="theme-buttons"
        className="theme-controller btn btn-sm"
        aria-label="Dark"
        value="dark"
      />
      <input
        type="radio"
        name="theme-buttons"
        className="theme-controller btn btn-sm"
        aria-label="System"
        value="default"
      />
    </div>
  );
};