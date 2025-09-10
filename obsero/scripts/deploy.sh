# Container Log Manager Deployment Script

set -e

echo "🚀 Starting Container Log Manager deployment..."

# Configuration
APP_NAME="podman-log-manager"
DOCKER_COMPOSE_FILE="docker-compose.yaml"
BACKUP_DIR="./backups"
DATA_DIR="./data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Docker socket access
    if [ ! -S /var/run/docker.sock ]; then
        log_warn "Docker socket not found at /var/run/docker.sock"
        log_warn "Make sure Docker is running or adjust DOCKER_HOST in .env"
    fi
    
    log_info "Prerequisites check completed"
}

# Create necessary directories
setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$DATA_DIR/logs"
    mkdir -p "$BACKUP_DIR"
    
    # Set proper permissions
    chmod 755 "$DATA_DIR"
    chmod 755 "$DATA_DIR/logs"
    
    log_info "Directories setup completed"
}

# Backup existing data
backup_data() {
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR)" ]; then
        log_info "Creating backup of existing data..."
        
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$DATA_DIR" .
        
        log_info "Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
    fi
}

# Deploy application
deploy() {
    log_info "Deploying application..."
    
    # Pull latest images
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build and start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    log_info "Application deployed successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    # Wait for application to start
    sleep 10
    
    # Check if container is running
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        log_info "Container is running"
        
        # Check HTTP endpoint
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            log_info "Health check passed"
        else
            log_warn "Health check endpoint not responding"
        fi
    else
        log_error "Container is not running"
        exit 1
    fi
}

# Show status
show_status() {
    log_info "Application status:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    echo ""
    log_info "Application is available at: http://localhost:3000"
    log_info "To view logs: docker-compose logs -f"
    log_info "To stop: docker-compose down"
}

# Main deployment process
main() {
    echo "Container Log Manager Deployment"
    echo "================================"
    
    check_prerequisites
    setup_directories
    backup_data
    deploy
    health_check
    show_status
    
    log_info "Deployment completed successfully! 🎉"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "Stopping application..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        ;;
    "restart")
        log_info "Restarting application..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart
        ;;
    "logs")
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
        ;;
    "status")
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status}"
        exit 1
        ;;
esac
