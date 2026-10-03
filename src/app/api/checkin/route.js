import { getSession } from "@/lib/session";
import { collectCheckinReward } from "@/lib/coin";

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          success: false,
          message: "Not signed in",
        },
        { status: 401 }
      );
    }

    const result = await collectCheckinReward(session.accountId);

    if (!result.ok) {
      if (result.reason === "already_claimed") {
        return Response.json(
          {
            success: false,
            reason: "already_claimed",
            message: "Daily reward already claimed",
            coin: result.coin,
            streak: result.streak,
          },
          { status: 409 }
        );
      }

      return Response.json(
        {
          success: false,
          message: "Account not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      reward: result.reward,
      coin: result.coin,
      streak: result.streak,
    });
  } catch (error) {
    console.error("Check-in error:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to collect daily reward",
      },
      { status: 500 }
    );
  }
}