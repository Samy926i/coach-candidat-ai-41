import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CVUpload() {
  const navigate = useNavigate();
  // Redirect to unified CV import
  useEffect(() => {
    navigate('/cv-import');
  }, [navigate]);

  return null; // This component now just redirects
}