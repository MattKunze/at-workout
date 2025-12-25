import { ThemeSelector } from "../components/molecules/ThemeSelector";

export default function Preferences() {
  return (
    <div className="prose">
      <h1>User Preferences</h1>
      <p>This is a placeholder for user preferences.</p>
      
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Enable Notifications</span> 
          <input type="checkbox" className="toggle" defaultChecked />
        </label>
      </div>
      
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">Theme</span>
        </label>
        <ThemeSelector />
      </div>
    </div>
  );
}
