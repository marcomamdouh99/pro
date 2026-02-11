import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for updating a transfer
const updateTransferSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

// GET /api/transfers/[id] - Get a single transfer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transfer = await db.inventoryTransfer.findUnique({
      where: { id: params.id },
      include: {
        sourceBranch: true,
        targetBranch: true,
        items: {
          include: {
            ingredient: true,
            sourceInventory: true,
            targetInventory: true,
          },
        },
        requester: {
          select: { id: true, name: true, username: true },
        },
        approver: {
          select: { id: true, name: true, username: true },
        },
        completer: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    );
  }
}

// PUT /api/transfers/[id] - Update a transfer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateTransferSchema.parse(body);

    // Check if transfer exists
    const existingTransfer = await db.inventoryTransfer.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (!existingTransfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    let updateData: any = { ...validatedData };

    // If approving, set approver and approvedAt
    if (validatedData.status === 'APPROVED' && !existingTransfer.approvedBy) {
      updateData.approvedBy = body.userId || 'system';
      updateData.approvedAt = new Date();
    }

    // If completing, set completer and completedAt
    if (validatedData.status === 'COMPLETED' && !existingTransfer.completedBy) {
      updateData.completedBy = body.userId || 'system';
      updateData.completedAt = new Date();
    }

    // Process the transfer if status is COMPLETED
    if (validatedData.status === 'COMPLETED') {
      for (const item of existingTransfer.items) {
        // Find or create target inventory
        let targetInventory = await db.branchInventory.findUnique({
          where: {
            branchId_ingredientId: {
              branchId: existingTransfer.targetBranchId,
              ingredientId: item.ingredientId,
            },
          },
        });

        if (!targetInventory) {
          targetInventory = await db.branchInventory.create({
            data: {
              branchId: existingTransfer.targetBranchId,
              ingredientId: item.ingredientId,
              currentStock: item.quantity,
            },
          });
        } else {
          targetInventory = await db.branchInventory.update({
            where: { id: targetInventory.id },
            data: {
              currentStock: {
                increment: item.quantity,
              },
            },
          });
        }

        // Update transfer item with target inventory ID
        await db.inventoryTransferItem.update({
          where: { id: item.id },
          data: { targetInventoryId: targetInventory.id },
        });

        // Deduct from source inventory
        const sourceInventory = await db.branchInventory.findUnique({
          where: { id: item.sourceInventoryId },
        });

        if (sourceInventory) {
          await db.branchInventory.update({
            where: { id: item.sourceInventoryId },
            data: {
              currentStock: {
                decrement: item.quantity,
              },
            },
          });

          // Create inventory transaction for source (deduct)
          await db.inventoryTransaction.create({
            data: {
              branchId: existingTransfer.sourceBranchId,
              ingredientId: item.ingredientId,
              transactionType: 'ADJUSTMENT',
              quantityChange: -item.quantity,
              stockBefore: sourceInventory.currentStock,
              stockAfter: sourceInventory.currentStock - item.quantity,
              reason: `Transfer to ${existingTransfer.targetBranchId} - ${existingTransfer.transferNumber}`,
              createdBy: body.userId || 'system',
            },
          });
        }

        // Create inventory transaction for target (add)
        await db.inventoryTransaction.create({
          data: {
            branchId: existingTransfer.targetBranchId,
            ingredientId: item.ingredientId,
            transactionType: 'ADJUSTMENT',
            quantityChange: item.quantity,
            stockBefore: targetInventory.currentStock - item.quantity,
            stockAfter: targetInventory.currentStock,
            reason: `Transfer from ${existingTransfer.sourceBranchId} - ${existingTransfer.transferNumber}`,
            createdBy: body.userId || 'system',
          },
        });
      }
    }

    const transfer = await db.inventoryTransfer.update({
      where: { id: params.id },
      data: updateData,
      include: {
        sourceBranch: true,
        targetBranch: true,
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return NextResponse.json({ transfer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating transfer:', error);
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    );
  }
}

// DELETE /api/transfers/[id] - Delete a transfer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transfer = await db.inventoryTransfer.findUnique({
      where: { id: params.id },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending transfers' },
        { status: 400 }
      );
    }

    await db.inventoryTransfer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Transfer deleted successfully' });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    return NextResponse.json(
      { error: 'Failed to delete transfer' },
      { status: 500 }
    );
  }
}
