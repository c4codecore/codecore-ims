from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


class LoginView(TokenObtainPairView):
    """Username + Password → Access + Refresh Token milega"""
    pass


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Refresh token blacklist mein daalo"""
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Logout successful"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Current logged in user ki info"""
    user = request.user
    return Response({
        "id"      : user.id,
        "username": user.username,
        "email"   : user.email,
        "role"    : user.role,      # tumhara custom field
    })