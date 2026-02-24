import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TurfSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const userName = state?.userName || "Player";
  const email = state?.email || "";

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

      <div className="text-center space-y-8 max-w-xl w-full">

        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-200 to-orange-200 flex items-center justify-center shadow-xl">
            <img
              src="/VSA-Logo-1.png"   // adjust path if needed
              alt="VSA Logo"
              className="w-18 h-18 object-contain"
            />
          </div>
        </div>

        {/* Trophy Icon
        <div className="flex justify-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-600 to-orange-500 flex items-center justify-center shadow-xl">
            <Trophy className="text-white w-12 h-12" />
          </div>
        </div> */}

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-4xl font-bold text-gray-900">
            Booking Confirmed! 🎉
          </h1>

          <p className="text-lg text-green-700 font-medium">
            You're all set, {userName}!
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border space-y-4">

          <p className="text-gray-600">
            A confirmation has been sent to
          </p>

          <p className="text-lg font-semibold text-gray-900">
            {email}
          </p>

          <hr />

          <p className="text-gray-600 text-sm">
            Please arrive 10 minutes before your session.
            See you on the field! ⚡
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate("/my-turf-bookings")}
          >
            View My Bookings
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