import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EnrollmentSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const userName = state?.userName || "Player";
  const email = state?.email || "";
  const batchName = state?.batchName || "Your Batch";
  const sportName = state?.sportName || "Sport";

  useEffect(() => {
    window.scrollTo(0, 0);

    // 🎉 Light Confetti Burst
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div className=" bg-gray-50 flex items-center justify-center px-6">

      <div className="text-center space-y-4 max-w-xl w-full">

        {/* VSA Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-200 to-orange-200 flex items-center justify-center shadow-xl">
            <img
              src="/VSA-Logo-1.png"   // adjust path if needed
              alt="VSA Logo"
              className="w-18 h-18 object-contain"
            />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-4xl font-bold text-gray-900">
            Enrollment Successful! 🎉
          </h1>

          <p className="text-lg text-green-700 font-medium">
            Welcome to Academy, {userName}!
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-2 sm:p-6 border space-y-4">

          <p className="text-gray-600">
            You've successfully enrolled in
          </p>

          <p className="text-lg font-semibold text-gray-900">
            {batchName} – {sportName}
          </p>

          <hr />

          {email && (
            <>
              <p className="text-gray-600">
                Confirmation has been sent to
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {email}
              </p>
              <hr />
            </>
          )}

          <p className="text-gray-600 text-sm">
            Please arrive on time for your sessions.
            Let’s train hard and win big! 💪🔥
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center pt-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate("/my-enrollments")}
          >
            View My Enrollments
          </Button>

          <Button
            className="bg-green-700 hover:bg-green-800"
            onClick={() => navigate("/", { replace: true })}
          >
            Back to Home
          </Button>
        </div>

      </div>
    </div>
  );
}