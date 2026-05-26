import "../styles/breathe.css";
import swirl from "../assets/swirl.png";

export default function Breathe({ size = 280, className = "" }) {
  const logoSize = typeof size === "number" ? `${size}px` : size;

  return (
    <div className={`breathe ${className}`.trim()} aria-hidden="true" style={{ width: logoSize, height: logoSize }}>
      <div className="breathe__layer breathe__layer--outer" />
      <div className="breathe__layer breathe__layer--inner" />
      <img className="breathe__icon" src={swirl} alt="" />
    </div>
  );
}
