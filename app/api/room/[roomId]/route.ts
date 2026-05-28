/* eslint-disable @typescript-eslint/no-unused-vars */
import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await getServerSession(); // Get current user session
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/");
    const roomId = pathSegments[pathSegments.length - 1];
    // console.log("room id is here:-", roomId);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email ?? ""
        }
    });
  
    // console.log("finding room");
    try {
      const room = await prismaClient.room.findUnique({
        where: { code: roomId },
      });
  
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
  
      // Check both room creator and RoomUser role for admin status
      let isAdmin = false;
      if (user) {
        if (user.id === room.adminId) {
          isAdmin = true;
        } else {
          const roomUser = await prismaClient.roomUser.findUnique({
            where: {
              userId_roomId: {
                userId: user.id,
                roomId: room.id,
              },
            },
          });
          isAdmin = roomUser?.role === "ADMIN";
        }
      }
  
      return NextResponse.json({ room, isAdmin, userId: user?.id });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }
