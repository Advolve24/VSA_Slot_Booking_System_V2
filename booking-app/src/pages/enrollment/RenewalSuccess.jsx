import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";

export default function RenewalSuccess() {

  const { state } = useLocation();
  const navigate = useNavigate();

  const userName = state?.playerName || "Player";
  const email = state?.email || "";
  const sportName = state?.sportName || "";
  const batchName = state?.batchName || "";
  const planType = state?.planType || "monthly";

  useEffect(() => {

    window.scrollTo(0, 0);

    /* 🎉 Confetti Burst */

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

    <div className="bg-gray-50 flex items-center justify-center px-6">

      <div className="text-center space-y-8 max-w-xl w-full">

        {/* LOGO */}

        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-200 to-orange-200 flex items-center justify-center shadow-xl">

            <img
              src="/VSA-Logo-1.png"
              alt="VSA Logo"
              className="w-18 h-18 object-contain"
            />

          </div>
        </div>

        {/* HEADING */}

        <div className="space-y-2">

          <h1 className="text-xl sm:text-4xl font-bold text-gray-900">
            Enrollment Renewed! 🎉
          </h1>

          <p className="text-lg text-green-700 font-medium">
            Great choice, {userName}!
          </p>

        </div>

        {/* CARD */}

        <div className="bg-white rounded-2xl shadow-lg p-6 border space-y-4">

          <p className="text-gray-600">
            Your coaching plan has been successfully renewed.
          </p>

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">
              <span className="text-gray-500">Sport</span>
              <span className="font-medium">{sportName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Batch</span>
              <span className="font-medium">{batchName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="capitalize font-medium">{planType}</span>
            </div>

          </div>

          <hr />

          <p className="text-gray-600 text-sm">
            A renewal confirmation has been sent to
          </p>

          <p className="text-sm sm:text-lg font-semibold text-gray-900">
            {email}
          </p>

          <p className="text-gray-600 text-sm">
            We look forward to seeing you continue your training! ⚡
          </p>

        </div>

        {/* BUTTONS */}

        <div className="flex gap-4 justify-center pt-4">

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