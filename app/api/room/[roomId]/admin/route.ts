/* eslint-disable @typescript-eslint/no-unused-vars */
import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: List all admins in a room
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/");
  const roomId = pathSegments[pathSegments.length - 2]; // roomId is before "admin"

  const user = await prismaClient.user.findFirst({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  try {
    const room = await prismaClient.room.findUnique({
      where: { code: roomId },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const admins = await prismaClient.roomUser.findMany({
      where: { roomId: room.id, role: "ADMIN" },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    const users = await prismaClient.roomUser.findMany({
      where: { roomId: room.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json({ admins, users, creatorId: room.adminId });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Toggle a user's admin status (promote/demote)
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/");
  const roomId = pathSegments[pathSegments.length - 2];

  const body = await req.json();
  const { targetUserId } = body;

  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
  }

  const currentUser = await prismaClient.user.findFirst({
    where: { email: session.user.email },
  });
  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 403 });
  }

  try {
    const room = await prismaClient.room.findUnique({
      where: { code: roomId },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Verify current user is admin
    let currentIsAdmin = currentUser.id === room.adminId;
    if (!currentIsAdmin) {
      const currentRoomUser = await prismaClient.roomUser.findUnique({
        where: { userId_roomId: { userId: currentUser.id, roomId: room.id } },
      });
      currentIsAdmin = currentRoomUser?.role === "ADMIN";
    }

    if (!currentIsAdmin) {
      return NextResponse.json({ error: "Only admins can manage roles" }, { status: 403 });
    }

    // Cannot demote the room creator
    if (targetUserId === room.adminId) {
      return NextResponse.json({ error: "Cannot change the room creator's role" }, { status: 403 });
    }

    // Toggle target user's role
    const existingRoomUser = await prismaClient.roomUser.findUnique({
      where: { userId_roomId: { userId: targetUserId, roomId: room.id } },
    });

    if (!existingRoomUser) {
      return NextResponse.json({ error: "User is not in this room" }, { status: 404 });
    }

    const newRole = existingRoomUser.role === "ADMIN" ? "USER" : "ADMIN";

    await prismaClient.roomUser.update({
      where: { userId_roomId: { userId: targetUserId, roomId: room.id } },
      data: { role: newRole },
    });

    return NextResponse.json({ message: `User ${newRole === "ADMIN" ? "promoted" : "demoted"} successfully`, role: newRole });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
