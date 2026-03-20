import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

export default function RoleGuard({ allow, children }) {

  const { user } = useAuth();

  if (!user) return <Navigate to="/admin/login" />;

  if (!allow.includes(user.role)) {

    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="bg-white border rounded-xl p-8 text-center shadow-md">

          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Access Denied
          </h2>

          <p className="text-gray-500 text-sm">
            You don't have permission to access this page.
          </p>

        </div>
      </div>
    );

  }

  return children;

}