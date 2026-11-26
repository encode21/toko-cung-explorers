import "./location-notice.css";

export function LocationNotice({
  locationKey,
  title,
  description,
}: {
  locationKey: string;
  title: string;
  description?: string;
}) {
  return (
    <div
      className="location-notice"
      data-location-notice
      data-location-key={locationKey}
      role="status"
      aria-atomic="true"
    >
      <div className="location-notice-message">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
    </div>
  );
}
